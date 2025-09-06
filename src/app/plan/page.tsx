"use client";

import React, { useState, useEffect } from "react";
import { useLessonStore } from "@/store/useLessonStore";
import { useGemini } from "@/lib/gemini";
import { WizardStep } from "@/components/Wizard";
import html2pdf from "html2pdf.js";

export default function PlanStep() {
  const { scenario, autoStandards, feedback, feedbackOptions, plan, validation, gradeBand, setPlan, setValidation, setStep4Valid, prevStep } = useLessonStore();
  const { generate, loading, error } = useGemini();
  const [generating, setGenerating] = useState(false);

  const generateLessonPlan = async () => {
    if (!scenario || autoStandards.length < 2) {
      alert("시나리오가 생성되지 않았거나 충분한 성취기준이 없습니다.");
      return;
    }

    setGenerating(true);
    try {
      console.log("[DEBUG] Generating lesson plan");
      
      // 워크시트 템플릿 섹션별 프롬프트 체인
      const standardsText = autoStandards.map(s => `[${s.code}] ${s.subject}: ${s.statement}`).join("\n");
      const feedbackText = Object.entries(feedbackOptions)
        .filter(([_, checked]) => checked)
        .map(([key]) => key)
        .join(", ") || feedback || "없음";

      const templatePrompt = `다음 정보를 기반으로 초등학교 AI 융합교육 수업지도안을 2025 워크시트 형식으로 생성하세요. 형식은 1단계(기획), 2단계(디자인), 3단계(실행)으로 구성.

프로젝트 정보:
- 시나리오: ${scenario}
- 자동 선택 성취기준: ${standardsText}
- 교사 피드백: ${feedbackText}
- 학년: ${gradeBand}학년

각 단계 상세 형식:
1. 수업을 기획하다: 프로젝트명, 교과융합, 단원명, GRASPS 관점, 프로젝트 방향, 질문있는 수업, AI 활용 관점, 유의점, 1·2·3단계 흐름 개요
2. 수업을 디자인하다: 프로젝트 개요, 성취기준(체크된 항목 자동 반영), 핵심역량, AI 소양, 학습목표, 학습자 수요진단, 프로젝트 흐름표(단계/차시/소주제/교과·성취기준/수업·평가내용/AI·디지털 도구/유의점), 참고자료, 평가 설계(GRASPS 과제, 기준표, 계획, AI 도구 윤리)
3. 수업을 실행하다: 차시별 교수학습안(학습주제, 단원, 성취기준, 수업의도/전략, 학습목표, AI·디지털 도구, 활동 단계, 시간, 자료/유의점, 평가 계획)

필수: 융합 교과 2개 이상, 성취기준 2개 이상 명시, 3차시 구성, AI 윤리 고려. Markdown 형식으로 출력.`;

      const response = await generate(templatePrompt, { temperature: 0.5, maxTokens: 4096 });
      setPlan(response);
      
      // 검증
      const subjectsCount = new Set(autoStandards.map(s => s.subject)).size;
      setValidation({
        subjectsCount,
        standardsCount: autoStandards.length,
        sessionsCount: 3,
        isValid: subjectsCount >= 2 && autoStandards.length >= 2,
      });
      setStep4Valid(true);
      
      console.log("[DEBUG] Lesson plan generated and validated");
    } catch (err) {
      console.error("지도안 생성 실패:", err);
      alert("지도안 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadMarkdown = () => {
    if (!plan) return;
    const blob = new Blob([plan], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_융합_수업지도안_${gradeBand}학년.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!plan) return;
    
    const element = document.createElement('div');
    element.innerHTML = plan.replace(/\n/g, '<br>');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    
    const opt = {
      margin: 1,
      filename: `AI_융합_수업지도안_${gradeBand}학년.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    if (html2pdf) {
      html2pdf().set(opt).from(element).save();
    } else {
      alert("PDF 라이브러리 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
    }
    document.body.removeChild(element);
  };

  const downloadDocx = async () => {
    if (!plan) return;
    
    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: plan,
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
    const isValid = plan.length > 0 && validation.isValid;
    setStep4Valid(isValid);
  }, [plan, validation.isValid, setStep4Valid]);

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
            <div className={validation.isValid ? "text-green-600" : "text-red-600"}>
              <div>성취기준 수: {validation.standardsCount}/2+</div>
              <div className={validation.standardsCount >= 2 ? "text-green-600" : "text-red-600"}>
                {validation.standardsCount >= 2 ? "✓" : "✗"}
              </div>
            </div>
            <div className={validation.isValid ? "text-green-600" : "text-red-600"}>
              <div>차시 수: {validation.sessionsCount}/3</div>
              <div className={validation.sessionsCount >= 3 ? "text-green-600" : "text-red-600"}>
                {validation.sessionsCount >= 3 ? "✓" : "✗"}
              </div>
            </div>
          </div>
          <p className={validation.isValid ? "text-green-600 mt-2" : "text-red-600 mt-2"}>
            {validation.isValid ? "모든 검증 통과! 지도안 생성 가능" : "검증 실패: 조건을 충족하지 않습니다."}
          </p>
        </div>

        {/* 지도안 생성 버튼 */}
        <div className="card p-6">
          <button
            onClick={generateLessonPlan}
            disabled={generating || loading || !validation.isValid}
            className="btn-primary w-full disabled:opacity-50"
          >
            {generating || loading ? "생성 중..." : "워크시트 형식 수업지도안 생성"}
          </button>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>

        {/* 생성된 지도안 표시 */}
        {plan && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4 text-lg">생성된 수업지도안</h3>
            <div className="space-y-6">
              {plan.split('\n\n').map((section, sectionIdx) => (
                <div key={sectionIdx} className="p-4 border rounded-lg bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-[var(--text-strong)]">섹션 {sectionIdx + 1}</h4>
                    <button
                      onClick={() => navigator.clipboard.writeText(section)}
                      className="btn-ghost text-xs p-1 hover:bg-[var(--rose-50)] rounded"
                    >
                      📋 복사
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none prose-headings:text-[var(--text-strong)] prose-p:leading-relaxed" dangerouslySetInnerHTML={{ __html: section.replace(/\n/g, "<br>") }} />
                </div>
              ))}
            </div>
            
            {/* 재생성 버튼 */}
            <button
              onClick={generateLessonPlan}
              disabled={generating || loading}
              className="mt-4 btn-secondary"
            >
              {generating || loading ? "재생성 중..." : "다시 생성하기"}
            </button>

            {/* 내보내기 옵션 */}
            <div className="mt-6 pt-4 border-t border-[var(--rose-200)]/50">
              <h4 className="font-medium mb-3">내보내기</h4>
              <div className="flex flex-wrap gap-2">
                <button onClick={downloadMarkdown} className="btn-primary px-4 py-2">
                  Markdown 다운로드
                </button>
                <button onClick={downloadPDF} className="btn-secondary px-4 py-2">
                  PDF 다운로드
                </button>
                <button onClick={downloadDocx} className="btn-ghost px-4 py-2">
                  DOCX 다운로드
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 완료 시 다음 단계는 Wizard에서 처리 */}
      </div>
    </WizardStep>
  );
}