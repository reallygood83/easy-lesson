"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLessonStore, AutoStandard } from "@/store/useLessonStore";
import { useGemini } from "@/lib/gemini";
import { WizardStep } from "@/components/Wizard";

// 타입 정의 (StandardsPicker에서 가져온 타입)
type StandardItem = {
  framework: "2015" | "2022";
  subject: string;
  gradeBand: "1-2" | "3-4" | "5-6";
  code: string;
  statement: string;
};

export default function ScenarioStep() {
  const { selectedIdea, keywords, gradeBand, scenario, feedback, feedbackOptions, autoStandards, setScenario, setFeedback, setFeedbackOptions, setAutoStandards, setValidation, setStep3Valid, prevStep } = useLessonStore();
  const { generate, loading, error } = useGemini();
  const [generating, setGenerating] = useState(false);
  const [feedbackText, setFeedbackText] = useState(feedback);
  const [showFeedback, setShowFeedback] = useState(false);

  const loadAutoStandards = useCallback(async () => {
    if (!selectedIdea) return;

    try {
      console.log("[DEBUG] Loading standards for auto selection");
      const res = await fetch("/api/standards");
      const { items } = await res.json();
      
      // 키워드와 아이디어에서 검색어 추출
      const searchTerms = [...keywords, selectedIdea.title, selectedIdea.description].join(" ");
      
      // 관련 standards 필터링 (최소 2개, 서로 다른 교과)
      const relevantStandards = items
        .filter((item: StandardItem) => item.gradeBand === gradeBand)
        .filter((item: StandardItem) => searchTerms.toLowerCase().includes(item.subject.toLowerCase()) || 
                                      searchTerms.toLowerCase().includes(item.code.toLowerCase()) ||
                                      item.statement.toLowerCase().includes(searchTerms.toLowerCase()))
        .sort((a: StandardItem, b: StandardItem) => a.subject.localeCompare(b.subject))
        .slice(0, 5); // 상위 5개

      // 서로 다른 교과 2개 이상 확보
      const selectedStandards: AutoStandard[] = [];
      const subjects = new Set<string>();
      for (const standard of relevantStandards) {
        if (subjects.size < 2 || Math.random() > 0.5) { // 무작위로 추가하여 다양성 확보
          subjects.add(standard.subject);
          selectedStandards.push({
            framework: standard.framework,
            subject: standard.subject,
            gradeBand: standard.gradeBand,
            code: standard.code,
            statement: standard.statement,
          });
        }
        if (selectedStandards.length >= 4) break; // 최대 4개
      }

      setAutoStandards(selectedStandards);
      console.log("[DEBUG] Auto selected standards:", selectedStandards);
    } catch (err) {
      console.error("[DEBUG] Auto standards load failed:", err);
      // fallback: 기본 성취기준 2개 제공
       const fallbackStandards: AutoStandard[] = [
         {
           framework: "2022",
           subject: "국어",
           gradeBand: gradeBand || "3-4",
           code: "[2국01-01]",
           statement: "자신의 경험을 바탕으로 하여 느낌이나 생각을 말한다."
         },
         {
           framework: "2022",
           subject: "수학",
           gradeBand: gradeBand || "3-4",
           code: "[2수03-01]",
           statement: "구체물이나 그림을 이용하여 덧셈과 뺄셈의 의미를 이해한다."
         }
       ];
      setAutoStandards(fallbackStandards);
      console.log("[DEBUG] Using fallback standards:", fallbackStandards);
    }
  }, [selectedIdea, keywords, gradeBand, setAutoStandards]);

  // 자동 성취기준 선택
  useEffect(() => {
    if (selectedIdea && keywords.length > 0 && gradeBand && autoStandards.length === 0) {
      loadAutoStandards();
    }
    // step2 validation 업데이트 (아이디어가 선택되면 step2는 valid)
    if (selectedIdea) {
      const { validateStep } = useLessonStore.getState();
      validateStep(2, true);
    }
  }, [selectedIdea, keywords, gradeBand, autoStandards.length, loadAutoStandards]);

  // validation 체크
  useEffect(() => {
    const isValid = scenario.length > 0 && autoStandards.length >= 2;
    setStep3Valid(isValid);
    // stepValidation도 함께 업데이트
    const { validateStep } = useLessonStore.getState();
    validateStep(3, isValid);
  }, [scenario, autoStandards.length, setStep3Valid]);

  const generateScenario = async () => {
    if (!selectedIdea || autoStandards.length < 2) {
      alert("아이디어가 선택되지 않았거나 충분한 성취기준이 없습니다.");
      return;
    }

    setGenerating(true);
    try {
      console.log("[DEBUG] Generating scenario");
      const standardsText = autoStandards.map(s => `[${s.code}] ${s.statement}`).join("\n");
      const prompt = `선택된 프로젝트 아이디어: ${selectedIdea.title} - ${selectedIdea.description}
키워드: ${keywords.join(", ")}
학년: ${gradeBand}학년
자동 선택된 성취기준 (최소 2개 이상 포함):
${standardsText}

위 정보를 기반으로 초등학교 AI 융합교육 시나리오를 생성하세요. 형식:
1. 프로젝트 목표 (GRASPS 관점)
2. 융합 교과 (2개 이상 명시)
3. 단계별 활동 개요 (1·2·3차시)
4. AI·디지털 도구 제안
5. 평가 방법

교사 피드백: ${feedback || "없음"}
AI 윤리 고려, 협력 활동 강조.`;

      const response = await generate(prompt, { temperature: 0.8 });
      setScenario(response);
      setValidation({
        subjectsCount: new Set(autoStandards.map(s => s.subject)).size,
        standardsCount: autoStandards.length,
        sessionsCount: 3,
        isValid: new Set(autoStandards.map(s => s.subject)).size >= 2 && autoStandards.length >= 2,
      });
      console.log("[DEBUG] Scenario generated:", response);
    } catch (err) {
      console.error("시나리오 생성 실패:", err);
      alert("시나리오 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleFeedbackSubmit = () => {
    setFeedback(feedbackText);
    setShowFeedback(false);
    generateScenario(); // 피드백 반영 재생성
  };

  if (!selectedIdea) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl md:text-2xl font-semibold text-ink mt-6">융합교육 시나리오</h1>
        <div className="card p-6 md:p-8 mt-4">
          <p className="text-ink/80">먼저 프로젝트 아이디어를 선택해 주세요.</p>
          <button onClick={prevStep} className="mt-4 btn-primary">
            아이디어 생성으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <WizardStep label="2단계 · 융합교육 시나리오 생성">
      <div className="mx-auto max-w-5xl space-y-6">
        <p className="text-ink/80">선택된 아이디어 &quot;{selectedIdea.title}&quot;를 기반으로 시나리오를 생성합니다.</p>

        {/* 선택된 아이디어 표시 */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">선택된 프로젝트:</h3>
          <p className="mb-2">{selectedIdea.description}</p>
          <div className="text-sm text-[var(--text-muted)]">
            키워드: {keywords.join(", ")} | 학년: {gradeBand}학년
          </div>
        </div>

        {/* 자동 선택된 성취기준 표시 */}
        {autoStandards.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold mb-2">AI 자동 선택 성취기준 ({autoStandards.length}개)</h3>
            <div className="space-y-2">
              {autoStandards.map((standard, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                  <span className="font-mono text-sm text-[var(--rose-600)]">{standard.code}</span>
                  <div>
                    <div className="font-medium">{standard.subject} ({standard.gradeBand}학년)</div>
                    <div className="text-sm text-[var(--text-muted)]">{standard.statement}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">교과 수: {new Set(autoStandards.map(s => s.subject)).size}개</p>
          </div>
        )}

        {/* 시나리오 생성 버튼 */}
        <div className="card p-6">
          <button
            onClick={generateScenario}
            disabled={generating || loading || autoStandards.length < 2}
            className="btn-primary disabled:opacity-50 w-full"
          >
            {generating || loading ? "생성 중..." : "시나리오 생성하기"}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        {/* 생성된 시나리오 표시 */}
        {scenario && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4">생성된 융합교육 시나리오</h3>
            <div className="prose max-w-none whitespace-pre-wrap">{scenario}</div>
            
            {/* 피드백 UI */}
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="mt-4 btn-ghost"
            >
              {showFeedback ? "피드백 닫기" : "피드백으로 수정하기"}
            </button>

            {showFeedback && (
              <div className="mt-4 space-y-3 p-4 border rounded-lg bg-gray-50">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="수정 요구사항을 입력하세요 (예: '더 많은 협력 활동 추가', '난이도 낮추기')"
                  className="w-full h-20 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--rose-300)]"
                />
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={feedbackOptions.difficultyEasy}
                      onChange={(e) => setFeedbackOptions({ ...feedbackOptions, difficultyEasy: e.target.checked })}
                      className="accent-[var(--rose-400)]"
                    />
                    난이도 낮추기
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={feedbackOptions.ethics}
                      onChange={(e) => setFeedbackOptions({ ...feedbackOptions, ethics: e.target.checked })}
                      className="accent-[var(--rose-400)]"
                    />
                    AI 윤리 강조
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={feedbackOptions.collaboration}
                      onChange={(e) => setFeedbackOptions({ ...feedbackOptions, collaboration: e.target.checked })}
                      className="accent-[var(--rose-400)]"
                    />
                    협력 활동 강화
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={feedbackOptions.digitalTools}
                      onChange={(e) => setFeedbackOptions({ ...feedbackOptions, digitalTools: e.target.checked })}
                      className="accent-[var(--rose-400)]"
                    />
                    디지털 도구 추가
                  </label>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleFeedbackSubmit} className="btn-primary flex-1">
                    피드백 반영 재생성
                  </button>
                  <button onClick={() => setShowFeedback(false)} className="btn-ghost">
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 다음 단계 버튼은 Wizard에서 처리 */}
          </div>
        )}
      </div>
    </WizardStep>
  );
}