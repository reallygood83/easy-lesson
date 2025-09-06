"use client";

import { useRouter } from "next/navigation";
import { useLessonStore } from "@/store/useLessonStore";

export default function Home() {
  const router = useRouter();
  const { setCurrentStep } = useLessonStore();
  return (
    <div className="min-h-[70vh] mx-auto max-w-5xl">
      <section className="card p-6 md:p-8 mt-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-ink">AI 융합 수업지도안 도구</h1>
        <p className="mt-2 text-ink/80 leading-relaxed">
          키워드와 학년만 입력하면 프로젝트 아이디어 3개를 제안하고, 선택한 아이디어로 융합교육 시나리오를 생성한 뒤 교사의 피드백을 반영하여 최종 수업지도안을 자동으로 작성합니다.
        </p>
        <ul className="mt-4 text-ink/80 list-disc list-inside space-y-1">
          <li>2개 이상의 교과 융합 및 최소 2개의 성취기준 포함을 자동 검증</li>
          <li>학년대별(1–4: 2022, 5–6: 2015) 성취기준 파일을 이용한 정확한 매칭</li>
          <li>모델: gemini-2.5-flash, API 키는 브라우저에만 저장</li>
        </ul>
      </section>

      <section className="text-center mt-8">
        <p className="text-ink/80 mb-6 leading-relaxed">
          초등 교사를 위한 AI 융합 프로젝트 수업 설계 도구. 키워드와 학년만 입력하면 3단계 마법사로 완전한 수업지도안을 자동 생성합니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
          <button
            onClick={() => router.push("/settings")}
            className="btn-secondary px-6 py-3 flex-1"
          >
            API 키 설정
          </button>
          <button
            onClick={() => setCurrentStep(1)}
            className="btn-primary px-8 py-3 flex-1"
          >
            마법사 시작하기 →
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          3단계 과정: 아이디어 생성 → 시나리오 설계 → 지도안 완성
        </p>
      </section>
    </div>
  );
}
