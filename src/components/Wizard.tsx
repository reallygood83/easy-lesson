"use client";

import React from "react";
import { useLessonStore } from "@/store/useLessonStore";

interface WizardProps {
  children: React.ReactNode;
  className?: string;
}

interface WizardStep {
  key: number;
  label: string;
  component: React.ReactNode;
  validation?: boolean;
}

export default function Wizard({ children, className = "" }: WizardProps) {
  const { currentStep, nextStep, prevStep, stepValidation } = useLessonStore();
  const steps = React.Children.toArray(children) as React.ReactElement[];
  
  const currentStepValidation = stepValidation[currentStep];
  const canNext = currentStepValidation?.isValid !== false;

  const handleNext = () => {
    if (canNext) {
      nextStep();
    } else {
      alert("현재 단계의 데이터를 완성해 주세요.");
    }
  };

  const handlePrev = () => {
    prevStep();
  };

  const handleFinish = () => {
    if (canNext && currentStep === 4) {
      // 완료 처리 (내보내기 등)
      alert("수업지도안 생성 완료!");
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 진행 바 */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-ink/70 mb-2">
          <span>Step {currentStep} of 4</span>
          <span>{(steps[currentStep - 1] as React.ReactElement<{ label: string }>)?.props.label || `Step ${currentStep}`}</span>
        </div>
        <div className="w-full bg-rose-100 rounded-full h-2">
          <div 
            className="bg-rose-300 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* 단계 내용 */}
      <div className="card p-6 md:p-8">
        {steps[currentStep - 1]}
        
        {/* 네비게이션 버튼 */}
        <div className="flex justify-between mt-8 pt-4 border-t border-rose-200/50">
          {currentStep > 1 && (
            <button
              onClick={handlePrev}
              className="btn-ghost px-6 py-2"
            >
              ← 이전 단계
            </button>
          )}
          
          <div className="flex gap-2">
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canNext}
                className="btn-primary px-6 py-2 disabled:opacity-50"
              >
                다음 단계 →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canNext}
                className="btn-primary px-6 py-2 disabled:opacity-50"
              >
                지도안 완료 & 다운로드
              </button>
            )}
          </div>
        </div>

        {/* 단계 유효성 표시 */}
        {!canNext && currentStepValidation?.errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{currentStepValidation.errorMessage}</p>
          </div>
        )}
      </div>

      {/* 단계 미리보기 사이드바 (선택사항) */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          {/* 현재 단계 내용은 위에서 렌더링됨 */}
        </div>
        <div className="md:col-span-1 hidden md:block">
          <div className="sticky top-4 space-y-2">
            <h3 className="font-semibold text-ink mb-2">진행 상황</h3>
            {Array.from({ length: 4 }, (_, i) => i + 1).map(step => (
              <div key={step} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  step < currentStep ? 'bg-rose-300' : 
                  step === currentStep ? 'bg-rose-200' : 'bg-rose-100'
                }`} />
                <span className={step === currentStep ? "font-medium text-ink" : "text-ink/70"}>
                  Step {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 각 단계용 Wrapper 컴포넌트
export interface WizardStepProps {
  label: string;
  onValidate?: (isValid: boolean, errorMessage?: string) => void;
}

export function WizardStep({ children, label, onValidate }: React.PropsWithChildren<WizardStepProps>) {
  const stepNum = parseInt(label.match(/\d+/)?.[0] || "1");

  React.useEffect(() => {
    // 컴포넌트 마운트 시 validation 함수 제공
    if (onValidate) {
      // 부모 컴포넌트에서 validation 호출하도록 props 전달
      React.Children.forEach(children, child => {
        if (React.isValidElement(child)) {
          // 실제 validation 로직은 각 Step에서 처리
        }
      });
    }
  }, [children, onValidate]);

  return (
    <div data-step={stepNum}>
      <h2 className="text-2xl font-bold mb-4 text-ink">{label}</h2>
      {children}
    </div>
  );
}