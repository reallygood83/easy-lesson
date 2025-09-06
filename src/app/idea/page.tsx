"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLessonStore, LessonIdea } from "@/store/useLessonStore";
import { useGemini } from "@/lib/gemini";
import { WizardStep } from "@/components/Wizard";

export default function IdeaStep() {
  const { keywords, gradeBand, ideas, setKeywords, setGradeBand, setIdeas, setSelectedIdea, step1Valid, setStep1Valid } = useLessonStore();
  const { generate, loading, error } = useGemini();
  const [inputKeywords, setInputKeywords] = useState("");
  const [localIdeas, setLocalIdeas] = useState(ideas); // 로컬 상태로 UI 관리

  // 컴포넌트 마운트 시 Zustand 상태 동기화
  useEffect(() => {
    setInputKeywords(keywords.join(", "));
    setLocalIdeas(ideas);
  }, [keywords, ideas]);

  // validation 체크
  useEffect(() => {
    const isValid = inputKeywords.trim().length > 0 && gradeBand !== "" && localIdeas.length > 0;
    setStep1Valid(isValid);
  }, [inputKeywords, gradeBand, localIdeas.length, setStep1Valid]);

  const handleGenerateIdeas = async () => {
    if (!inputKeywords.trim() || !gradeBand) {
      alert("키워드와 학년을 입력해 주세요.");
      return;
    }

    try {
      console.log("[DEBUG] Generating ideas with keywords:", inputKeywords, "grade:", gradeBand);
      const prompt = `초등학교 ${gradeBand}학년을 대상으로 한 AI 융합 프로젝트 수업 아이디어를 3개 제안해 주세요. 키워드: ${inputKeywords}. 각 아이디어는 프로젝트 제목, 간단한 설명, 최소 3차시로 구성된 개요를 포함해야 합니다. 융합 교과 2개 이상을 고려하고, AI/디지털 도구 활용을 강조하세요. JSON 형식으로 출력하세요: [{"id":1,"title":"제목","description":"설명","sessions":[{"title":"1차시","overview":"개요"},{"title":"2차시","overview":"개요"},{"title":"3차시","overview":"개요"}]}]`;

      const response = await generate(prompt);
      const parsedIdeas = JSON.parse(response);
      setKeywords(inputKeywords.split(",").map(k => k.trim()));
      setIdeas(parsedIdeas);
      setLocalIdeas(parsedIdeas);
      console.log("[DEBUG] Ideas generated:", parsedIdeas);
    } catch (err) {
      console.error("아이디어 생성 실패:", err);
      alert("아이디어 생성 중 오류가 발생했습니다. API 키를 확인해 주세요.");
    }
  };

  const handleSelectIdea = (idea: LessonIdea) => {
    console.log("[DEBUG] Idea selected:", idea);
    setSelectedIdea(idea);
    // Wizard 네비게이션은 Wizard 컴포넌트에서 처리
  };

  return (
    <WizardStep label="1단계 · 프로젝트 아이디어 생성">
      <div className="space-y-6">
        <p className="text-[var(--text-muted)]">키워드와 학년을 입력하면 AI가 융합 프로젝트 아이디어 3개를 자동 생성합니다.</p>

        <div className="card p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-strong)] mb-2">
                키워드 (쉼표로 구분)
              </label>
              <input
                type="text"
                value={inputKeywords}
                onChange={(e) => setInputKeywords(e.target.value)}
                placeholder="예: 로봇, 환경, 팀워크"
                className="w-full rounded-md border border-[var(--rose-200)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--rose-300)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-strong)] mb-2">학년군</label>
              <select
                value={gradeBand}
                onChange={(e) => setGradeBand(e.target.value as "1-2" | "3-4" | "5-6")}
                className="w-full rounded-md border border-[var(--rose-200)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--rose-300)]"
              >
                <option value="">학년 선택</option>
                <option value="1-2">1-2학년</option>
                <option value="3-4">3-4학년</option>
                <option value="5-6">5-6학년</option>
              </select>
            </div>

            <button
              onClick={handleGenerateIdeas}
              disabled={!inputKeywords.trim() || !gradeBand || loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? "생성 중..." : "AI 아이디어 생성하기"}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {localIdeas.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--text-strong)]">추천 프로젝트 아이디어 (3개)</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localIdeas.map((idea: LessonIdea) => (
                <div key={idea.id} className="card p-4 hover:shadow-md transition-shadow border rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 text-[var(--text-strong)]">{idea.title}</h3>
                  <p className="text-[var(--text-muted)] mb-3 leading-relaxed">{idea.description}</p>
                  <div className="space-y-2 text-sm mb-4">
                    <h4 className="font-medium text-[var(--rose-700)]">차시별 개요:</h4>
                    {idea.sessions.map((session: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 pl-2 border-l-2 border-[var(--rose-200)]">
                        <span className="w-6 font-medium text-[var(--rose-600)] flex-shrink-0">{idx + 1}차시</span>
                        <div>
                          <div className="font-medium">{session.title}</div>
                          <div className="text-[var(--text-muted)]">{session.overview}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSelectIdea(idea)}
                    className="w-full btn-secondary"
                  >
                    이 아이디어 선택
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WizardStep>
  );
}