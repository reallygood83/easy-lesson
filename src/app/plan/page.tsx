"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLessonStore } from "@/store/useLessonStore";
import { useGemini } from "@/lib/gemini";
import { WizardStep } from "@/components/Wizard";
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
  const { generate, loading, error } = useGemini();
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

  const downloadMarkdown = () => {
    const allPlans = Object.entries(plans)
      .filter(([, content]) => content)
      .map(([session, content]) => `# ${session}\n\n${content}`)
      .join('\n\n---\n\n');
    
    if (!allPlans) return;
    const blob = new Blob([allPlans], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_융합_수업지도안_${gradeBand}학년.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    const allPlans = Object.entries(plans)
      .filter(([, content]) => content)
      .map(([session, content]) => `<h1>${session}</h1><div>${content.replace(/\n/g, '<br>')}</div>`)
      .join('<hr>');
    
    if (!allPlans) return;
    
    const element = document.createElement('div');
    element.innerHTML = allPlans;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    
    const opt: Html2PdfOptions = {
      margin: 1,
      filename: `AI_융합_수업지도안_${gradeBand}학년.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    const html2pdf = html2pdfRef.current;
    if (html2pdf) {
      html2pdf().set(opt).from(element).save();
    } else {
      alert("PDF 라이브러리 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
    }
    document.body.removeChild(element);
  };

  const downloadDocx = async () => {
    const allPlans = Object.entries(plans)
      .filter(([, content]) => content)
      .map(([session, content]) => `${session}\n\n${content}`)
      .join('\n\n---\n\n');
    
    if (!allPlans) return;
    
    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: allPlans,
                size: 24,
                font: "Calibri"
              })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_융합_수업지도안_${gradeBand}학년.docx`;
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
            시나리오 생성으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <WizardStep label="3단계 · 최종 수업지도안 생성">
      <div className="mx-auto max-w-6xl space-y-6">
        <p className="text-ink/80">워크시트 형식에 맞춰 3차시 수업지도안을 자동 생성합니다.</p>

        {/* 검증 상태 표시 */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">검증 결과</h3>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">차시별 수업지도안 생성</h3>
          
          <div className="grid grid-cols-3 gap-4">
            {["1차시", "2차시", "3차시"].map((session) => (
              <button
                key={session}
                onClick={() => generateLessonPlan(session)}
                disabled={generating[session] || !scenario || autoStandards.length < 2}
                className="btn-primary disabled:opacity-50"
              >
                {generating[session] ? "생성 중..." : `${session} 생성`}
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
                   <h3 className="text-lg font-semibold">{session} 수업지도안</h3>
                   <button 
                     onClick={() => navigator.clipboard.writeText(plans[session])}
                     className="btn-primary text-sm"
                   >
                     📋 복사하기
                   </button>
                 </div>
                 <div className="bg-white border rounded-lg p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-auto max-h-96">
                   {plans[session]}
                 </div>
               </div>
             )
           ))}
           
           {/* 전체 다운로드 버튼 */}
           {Object.values(plans).some(plan => plan.length > 0) && (
             <div className="card p-6">
               <h3 className="text-lg font-semibold mb-4">전체 지도안 다운로드</h3>
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


      </div>
    </WizardStep>
  );
}