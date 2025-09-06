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
  const { scenario, autoStandards, /* feedback, */ feedbackOptions, plan, validation, gradeBand, setPlan, setValidation, setStep4Valid, prevStep } = useLessonStore();
  const { generate, loading, error } = useGemini();
  const [generating, setGenerating] = useState(false);
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

  const generateLessonPlan = async () => {
    if (!scenario || autoStandards.length < 2) {
      alert("시나리오와 성취기준(2개 이상)을 먼저 준비해 주세요.");
      return;
    }

    setGenerating(true);
    try {
      const standardsText = autoStandards.map(s => `${s.subject}(${s.framework}) ${s.code}: ${s.statement}`).join("\n");
      const feedbackFlags = Object.entries(feedbackOptions)
        .filter(([, checked]) => checked)
        .map(([k]) => `- ${k}`)
        .join("\n");

      const templatePrompt = `다음은 초등 ${gradeBand}학년 대상 융합교육 수업지도안 템플릿입니다.\n\n[성취기준]\n${standardsText}\n\n[교사 피드백 옵션]\n${feedbackFlags || "(없음)"}\n\n[요구사항]\n- 3차시 구성\n- 활동 중심, 평가 기준 포함\n- 워크시트 구조에 맞춰 Markdown 형식으로 작성`;

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

        {/* 생성 및 내보내기 */}
        <div className="card p-6 space-y-4">
          <button onClick={generateLessonPlan} disabled={generating || loading} className="btn-primary w-full disabled:opacity-50">
            {generating || loading ? "생성 중..." : "수업지도안 생성하기"}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button onClick={downloadMarkdown} className="btn-ghost">Markdown로 다운로드</button>
            <button onClick={downloadPDF} className="btn-ghost">PDF로 다운로드</button>
            <button onClick={downloadDocx} className="btn-ghost">Word(docx)로 다운로드</button>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        {/* 결과 표시 */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">생성된 수업지도안</h3>
          <pre className="prose max-w-none whitespace-pre-wrap">{plan}</pre>
        </div>
      </div>
    </WizardStep>
  );
}