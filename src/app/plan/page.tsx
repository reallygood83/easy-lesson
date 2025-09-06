"use client";

import React, { useState, useEffect, useRef, ReactElement } from "react";
import { useLessonStore } from "@/store/useLessonStore";
import { useGemini } from "@/lib/gemini";
import { WizardStep } from "@/components/Wizard";
import LoadingModal from "@/components/LoadingModal";
// html2pdf 최소 타입 정의
type Html2PdfOptions = {
  margin: number;
  filename: string;
  image: { type: "jpeg" | "png"; quality: number };
  html2canvas: { scale: number };
  jsPDF: { unit: "in" | "mm" | "cm" | "px"; format: string | [number, number]; orientation: "portrait" | "landscape" };
};

type Html2PdfChain = {
  set: (opt: Html2PdfOptions) => { from: (el: HTMLElement) => { save: () => void } };
};

type Html2Pdf = () => Html2PdfChain;

export default function PlanStep() {
  const { scenario, autoStandards, gradeBand, setStep4Valid, prevStep } = useLessonStore();
  const { generate, error } = useGemini();
  const [plans, setPlans] = useState<{[key: string]: string}>({
    "1차시": "",
    "2차시": "",
    "3차시": ""
  });
  const [generating, setGenerating] = useState<{[key: string]: boolean}>({
    "1차시": false,
    "2차시": false,
    "3차시": false
  });
  const [worksheets, setWorksheets] = useState<{[key: string]: string}>({
    "1차시": "",
    "2차시": "",
    "3차시": ""
  });
  const [generatingWorksheet, setGeneratingWorksheet] = useState<{[key: string]: boolean}>({
    "1차시": false,
    "2차시": false,
    "3차시": false
  });
  const [feedbackOptions] = useState({
    "구체적 활동 예시 추가": false,
    "평가 루브릭 상세화": false,
    "차별화 전략 포함": false,
    "안전 고려사항 명시": false,
  });
  const [validation, setValidation] = useState({
    subjectsCount: 0,
    standardsCount: 0,
    sessionsCount: 0,
    isValid: false,
  });
  const html2pdfRef = useRef<Html2Pdf | null>(null);

  // html2pdf 클라이언트 전용 로딩
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === "undefined") return;
      try {
        const imported = (await import("html2pdf.js")) as unknown as Html2Pdf | { default: Html2Pdf };
        const lib: Html2Pdf = ("default" in imported ? imported.default : imported);
        if (mounted) html2pdfRef.current = lib;
      } catch (e) {
        console.warn("[WARN] html2pdf 로딩 실패", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const generateLessonPlan = async (session: string) => {
    if (!scenario || autoStandards.length < 2) {
      alert("시나리오와 성취기준(2개 이상)을 먼저 준비해 주세요.");
      return;
    }

    setGenerating(prev => ({ ...prev, [session]: true }));
    try {
      const standardsText = autoStandards.map(s => `${s.subject}(${s.framework}) ${s.code}: ${s.statement}`).join("\n");
      const feedbackFlags = Object.entries(feedbackOptions)
        .filter(([, checked]) => checked)
        .map(([k]) => `- ${k}`)
        .join("\n");

      const templatePrompt = `다음 시나리오를 기반으로 초등 ${gradeBand}학년 대상 ${session} 수업지도안을 작성하세요.

[시나리오]
${scenario}

[성취기준]
${standardsText}

[교사 피드백 옵션]
${feedbackFlags || "(없음)"}

[요구사항]
- 반드시 위 시나리오의 내용과 연계된 ${session} 지도안 작성
- ${session}에 해당하는 구체적인 활동과 목표 설정
- 다음 항목 포함:
  * 차시명: ${session}
  * 학습목표
  * 준비물
  * 단계별 활동 (도입-전개-정리)
  * 평가 기준
- 시나리오에서 제시된 AI 도구와 융합 교과 활용
- 복사하기 쉬운 텍스트 형식으로 작성 (마크다운 문법 최소화)
- ${session}만의 고유한 학습 내용과 활동 포함`;

      const response = await generate(templatePrompt, { temperature: 0.5, maxTokens: 4096 });
      setPlans(prev => ({ ...prev, [session]: response }));
      
      // 검증 - 모든 차시가 생성되었는지 확인
      const updatedPlans = { ...plans, [session]: response };
      const completedSessions = Object.values(updatedPlans).filter(plan => plan.length > 0).length;
      const subjectsCount = new Set(autoStandards.map(s => s.subject)).size;
      setValidation({
        subjectsCount,
        standardsCount: autoStandards.length,
        sessionsCount: completedSessions,
        isValid: subjectsCount >= 2 && autoStandards.length >= 2 && completedSessions >= 1,
      });
      setStep4Valid(completedSessions >= 1);
      
      console.log(`[DEBUG] ${session} lesson plan generated and validated`);
    } catch (err) {
      console.error(`${session} 지도안 생성 실패:`, err);
      alert(`${session} 지도안 생성 중 오류가 발생했습니다.`);
    } finally {
      setGenerating(prev => ({ ...prev, [session]: false }));
    }
  };

  const generateWorksheet = async (session: string) => {
    if (!plans[session]) {
      alert(`${session} 지도안을 먼저 생성해주세요.`);
      return;
    }

    setGeneratingWorksheet(prev => ({ ...prev, [session]: true }));

    try {
      const worksheetPrompt = `다음 ${session} 수업지도안을 바탕으로 학생 활동지를 작성해주세요.

수업지도안:
${plans[session]}

다음 형식으로 ${session} 학생 활동지를 작성해주세요:

# ${session} 학생 활동지

## 학습 목표
[이번 시간에 배울 내용]

## 활동 1: [활동명]
### 지시사항
[학생이 해야 할 일을 구체적으로 설명]

### 활동 내용
[빈칸, 표, 그림 그리기 공간 등]

## 활동 2: [활동명]
### 지시사항
[학생이 해야 할 일을 구체적으로 설명]

### 활동 내용
[빈칸, 표, 그림 그리기 공간 등]

## 정리하기
### 오늘 배운 내용
- [ ] 
- [ ] 
- [ ] 

### 느낀 점
[자유롭게 작성할 수 있는 공간]

학생들이 직접 작성하고 활동할 수 있는 구체적인 활동지로 만들어주세요.`;

      const result = await generate(worksheetPrompt);
      setWorksheets(prev => ({ ...prev, [session]: result }));
    } catch (error) {
      console.error('활동지 생성 오류:', error);
      alert('활동지 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingWorksheet(prev => ({ ...prev, [session]: false }));
    }
  };

  const downloadMarkdown = () => {
    const formatContentForMarkdown = (content: string) => {
      const lines = content.split('\n');
      let markdown = '';
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          markdown += '\n';
          return;
        }
        
        // 주요 제목
        if (trimmedLine.includes('차시') || trimmedLine.includes('학습목표') || 
            trimmedLine.includes('준비물') || trimmedLine.includes('평가') ||
            trimmedLine.includes('단계') || trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
          const title = trimmedLine.replace(/\*\*/g, '').replace(/:/g, '');
          markdown += `### ${title}\n\n`;
          return;
        }
        
        // 소제목
        if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*') && !trimmedLine.startsWith('**')) {
          const subtitle = trimmedLine.replace(/\*/g, '');
          markdown += `#### ${subtitle}\n\n`;
          return;
        }
        
        // 목록 항목
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || 
            trimmedLine.match(/^\d+\./)) {
          markdown += `${trimmedLine}\n`;
          return;
        }
        
        // 일반 텍스트
        markdown += `${trimmedLine}\n\n`;
      });
      
      return markdown;
    };
    
    const allPlans = Object.entries(plans)
      .filter(([, content]) => content)
      .map(([session, content]) => {
        let result = `# ${session}\n\n`;
        result += formatContentForMarkdown(content);
        if (worksheets[session]) {
          result += `## ${session} 학생 활동지\n\n`;
          result += formatContentForMarkdown(worksheets[session]);
        }
        return result;
      })
      .join('---\n\n');
    
    if (!allPlans) return;
    
    const blob = new Blob([allPlans], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_융합_수업지도안_및_활동지_${gradeBand}학년.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    const formatContentForPDF = (content: string) => {
      const lines = content.split('\n');
      let html = '';
      let inList = false;
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          if (inList) {
            html += '</ul>';
            inList = false;
          }
          return;
        }
        
        // 주요 제목
        if (trimmedLine.includes('차시') || trimmedLine.includes('학습목표') || 
            trimmedLine.includes('준비물') || trimmedLine.includes('평가') ||
            trimmedLine.includes('단계') || trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
          if (inList) {
            html += '</ul>';
            inList = false;
          }
          const title = trimmedLine.replace(/\*\*/g, '').replace(/:/g, '');
          html += `<h3 style="color: #1e40af; font-weight: bold; font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #dbeafe; padding-bottom: 4px;">${title}</h3>`;
          return;
        }
        
        // 소제목
        if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*') && !trimmedLine.startsWith('**')) {
          if (inList) {
            html += '</ul>';
            inList = false;
          }
          const subtitle = trimmedLine.replace(/\*/g, '');
          html += `<h4 style="font-weight: 600; color: #374151; margin-top: 16px; margin-bottom: 8px;">${subtitle}</h4>`;
          return;
        }
        
        // 목록 항목
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || 
            trimmedLine.match(/^\d+\./)) {
          if (!inList) {
            html += '<ul style="margin-left: 16px; margin-bottom: 16px;">';
            inList = true;
          }
          const item = trimmedLine.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
          html += `<li style="color: #374151; margin-bottom: 4px;">${item}</li>`;
          return;
        }
        
        // 일반 텍스트
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<p style="color: #374151; margin-bottom: 8px; line-height: 1.6;">${trimmedLine}</p>`;
      });
      
      if (inList) {
        html += '</ul>';
      }
      
      return html;
    };
    
    const allPlans = Object.entries(plans)
      .filter(([, content]) => content)
      .map(([session, content]) => {
        let result = `<h1 style="color: #1e40af; font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 3px solid #3b82f6; padding-bottom: 8px;">${session}</h1>`;
        result += formatContentForPDF(content);
        if (worksheets[session]) {
          result += `<h2 style="color: #059669; font-size: 20px; font-weight: bold; margin-top: 32px; margin-bottom: 16px; border-bottom: 2px solid #10b981; padding-bottom: 4px;">${session} 학생 활동지</h2>`;
          result += formatContentForPDF(worksheets[session]);
        }
        return result;
      })
      .join('<div style="page-break-before: always;"></div>');
    
    if (!allPlans) return;
    
    const element = document.createElement('div');
    element.innerHTML = `<div style="font-family: 'Malgun Gothic', sans-serif; font-size: 14px; line-height: 1.6; color: #111827; padding: 20px;">${allPlans}</div>`;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.width = '210mm';
    document.body.appendChild(element);
    
    const opt: Html2PdfOptions = {
      margin: 0.5,
      filename: `AI_융합_수업지도안_및_활동지_${gradeBand}학년.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    const html2pdf = html2pdfRef.current;
    if (html2pdf) {
      html2pdf().set(opt).from(element).save();
    } else {
      alert("PDF 라이브러리 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
    }
    document.body.removeChild(element);
  };

  // 지도안 텍스트를 구조화된 HTML로 변환하는 함수
  const formatLessonPlan = (content: string) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const formattedContent: ReactElement[] = [];
    let listItems: string[] = [];
    
    const flushListItems = () => {
      if (listItems.length > 0) {
        formattedContent.push(
          <ul key={`list-${formattedContent.length}`} className="list-disc list-inside ml-4 mb-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-gray-700">{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        flushListItems();
        return;
      }
      
      // 주요 제목 (차시명, 학습목표 등)
      if (trimmedLine.includes('차시') || trimmedLine.includes('학습목표') || 
          trimmedLine.includes('준비물') || trimmedLine.includes('평가') ||
          trimmedLine.includes('단계') || trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        flushListItems();
        const title = trimmedLine.replace(/\*\*/g, '').replace(/:/g, '');
        formattedContent.push(
          <h3 key={`title-${index}`} className="text-lg font-bold text-blue-800 mt-6 mb-3 border-b-2 border-blue-200 pb-1">
            {title}
          </h3>
        );
        return;
      }
      
      // 소제목
      if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*') && !trimmedLine.startsWith('**')) {
        flushListItems();
        const subtitle = trimmedLine.replace(/\*/g, '');
        formattedContent.push(
          <h4 key={`subtitle-${index}`} className="text-md font-semibold text-gray-800 mt-4 mb-2">
            {subtitle}
          </h4>
        );
        return;
      }
      
      // 목록 항목
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || 
          trimmedLine.match(/^\d+\./)) {
        const item = trimmedLine.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
        listItems.push(item);
        return;
      }
      
      // 일반 텍스트
      flushListItems();
      if (trimmedLine) {
        formattedContent.push(
          <p key={`text-${index}`} className="text-gray-700 mb-2 leading-relaxed">
            {trimmedLine}
          </p>
        );
      }
    });
    
    flushListItems();
    return formattedContent;
  };

  const downloadDocx = async () => {
    const allPlans = Object.entries(plans)
      .filter(([, content]) => content)
      .map(([session, content]) => {
        let result = `${session}\n\n${content}`;
        if (worksheets[session]) {
          result += `\n\n${session} 학생 활동지\n\n${worksheets[session]}`;
        }
        return result;
      })
      .join('\n\n---\n\n');
    
    if (!allPlans) return;
    
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    
    const children: any[] = [];
    
    Object.entries(plans)
      .filter(([, content]) => content)
      .forEach(([session, content]) => {
        // 차시 제목
        children.push(
          new Paragraph({
            text: session,
            heading: HeadingLevel.HEADING_1,
          })
        );
        
        // 내용을 문단별로 분리
        const lines = content.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: trimmedLine,
                    size: 24,
                    font: "맑은 고딕"
                  })
                ]
              })
            );
          }
        });
        
        // 활동지가 있으면 추가
        if (worksheets[session]) {
          children.push(
            new Paragraph({
              text: `${session} 학생 활동지`,
              heading: HeadingLevel.HEADING_2,
            })
          );
          
          const worksheetLines = worksheets[session].split('\n').filter(line => line.trim());
          worksheetLines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: trimmedLine,
                      size: 22,
                      font: "맑은 고딕"
                    })
                  ]
                })
              );
            }
          });
        }
      });
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_융합_수업지도안_및_활동지_${gradeBand}학년.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // validation 체크
  useEffect(() => {
    const completedSessions = Object.values(plans).filter(plan => plan.length > 0).length;
    const isValid = completedSessions >= 1 && validation.isValid;
    setStep4Valid(isValid);
  }, [plans, validation.isValid, setStep4Valid]);

  if (!scenario) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl md:text-2xl font-semibold text-ink mt-6">최종 수업지도안</h1>
        <div className="card p-6 md:p-8 mt-4">
          <p className="text-ink/80">먼저 융합교육 시나리오를 생성해 주세요.</p>
          <button onClick={prevStep} className="mt-4 btn-primary">
            ⬅️ 시나리오 생성으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <WizardStep label="3단계 · 📝 최종 수업지도안 생성">
      <div className="mx-auto max-w-6xl space-y-6">
        <p className="text-ink/70">📚 워크시트 형식에 맞춰 3차시 수업지도안을 자동 생성합니다.</p>

        {/* 검증 상태 표시 */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2 text-ink">✅ 검증 결과</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className={validation.isValid ? "text-green-600" : "text-red-600"}>
              <div>교과 수: {validation.subjectsCount}/2+</div>
              <div className={validation.subjectsCount >= 2 ? "text-green-600" : "text-red-600"}>
                {validation.subjectsCount >= 2 ? "✓" : "✗"}
              </div>
            </div>
            <div>
              <div>성취기준 수: {validation.standardsCount}/2+</div>
              <div className={validation.standardsCount >= 2 ? "text-green-600" : "text-red-600"}>
                {validation.standardsCount >= 2 ? "✓" : "✗"}
              </div>
            </div>
            <div>
              <div>차시 수: {validation.sessionsCount}/3</div>
              <div className={validation.sessionsCount >= 3 ? "text-green-600" : "text-red-600"}>
                {validation.sessionsCount >= 3 ? "✓" : "✗"}
              </div>
            </div>
          </div>
        </div>

        {/* 차시별 생성 */}
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink mb-4">📖 차시별 수업지도안 생성</h3>
          
          <div className="grid grid-cols-3 gap-4">
            {["1차시", "2차시", "3차시"].map((session) => (
              <button
                key={session}
                onClick={() => generateLessonPlan(session)}
                disabled={generating[session] || !scenario || autoStandards.length < 2}
                className="btn-primary disabled:opacity-50"
              >
                {generating[session] ? "⏳ 생성 중..." : `✨ ${session} 생성`}
              </button>
            ))}
          </div>



          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        {/* 차시별 지도안 표시 */}
         <div className="space-y-4">
           {["1차시", "2차시", "3차시"].map((session) => (
             plans[session] && (
               <div key={session} className="card p-6">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-semibold text-ink">{session} 수업지도안</h3>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => navigator.clipboard.writeText(plans[session])}
                       className="btn-primary text-sm"
                     >
                       📋 복사하기
                     </button>
                     <button
                       onClick={() => generateWorksheet(session)}
                       disabled={generatingWorksheet[session]}
                       className="btn-primary text-sm"
                     >
                       {generatingWorksheet[session] ? '⏳ 생성 중...' : '📝 활동지 생성'}
                     </button>
                   </div>
                 </div>
                 <div className="bg-white border rounded-lg p-6 overflow-auto max-h-96">
                   <div className="prose max-w-none lesson-plan-content">
                     {formatLessonPlan(plans[session])}
                   </div>
                 </div>

                 {/* 학생 활동지 표시 영역 */}
                 {worksheets[session] && (
                   <div className="mt-4 p-4 border rounded-lg bg-green-50">
                     <div className="flex justify-between items-center mb-3">
                       <h4 className="font-semibold text-green-800">{session} 학생 활동지</h4>
                       <button
                         onClick={() => navigator.clipboard.writeText(worksheets[session])}
                         className="btn-ghost text-sm"
                       >
                         📋 복사
                       </button>
                     </div>
                     <div className="prose max-w-none text-sm lesson-plan-content">
                       {formatLessonPlan(worksheets[session])}
                     </div>
                   </div>
                 )}
               </div>
             )
           ))}
           
           {/* 전체 다운로드 버튼 */}
           {Object.values(plans).some(plan => plan.length > 0) && (
             <div className="card p-6">
               <h3 className="text-lg font-semibold mb-4 text-ink">💾 전체 지도안 다운로드</h3>
               <div className="flex gap-2">
                 <button onClick={downloadMarkdown} className="btn-secondary text-sm">
                   📄 Markdown
                 </button>
                 <button onClick={downloadPDF} className="btn-secondary text-sm">
                   📄 PDF
                 </button>
                 <button onClick={downloadDocx} className="btn-secondary text-sm">
                   📄 DOCX
                 </button>
               </div>
               <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                 💡 <strong>사용 팁:</strong> 생성된 모든 차시의 지도안을 하나의 파일로 다운로드할 수 있습니다.
               </div>
             </div>
           )}
         </div>

         {/* AI 생성 중 모달 */}
         <LoadingModal 
           isOpen={Object.values(generating).some(g => g) || Object.values(generatingWorksheet).some(g => g)} 
           message={Object.values(generating).some(g => g) ? "AI 지도안 생성 중" : "AI 활동지 생성 중"} 
         />
      </div>
    </WizardStep>
  );
}