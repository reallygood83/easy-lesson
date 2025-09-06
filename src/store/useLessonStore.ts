import { create } from 'zustand';

// 타입 정의
export interface LessonIdea {
  id: number;
  title: string;
  description: string;
  sessions: Array<{ title: string; overview: string }>; // 최소 3차시
}

export interface AutoStandard {
  framework: "2015" | "2022";
  subject: string;
  gradeBand: "1-2" | "3-4" | "5-6";
  code: string;
  statement: string;
}

export interface StepValidation {
  isValid: boolean;
  errorMessage?: string;
}

export interface LessonState {
  // Wizard Navigation
  currentStep: 1 | 2 | 3 | 4;
  stepValidation: { [key: number]: StepValidation };
  
  // Step 1: 입력
  keywords: string[];
  gradeBand: "1-2" | "3-4" | "5-6" | "";
  step1Valid: boolean;
  
  // Step 2: 아이디어
  ideas: LessonIdea[];
  selectedIdea: LessonIdea | null;
  step2Valid: boolean;
  
  // Step 3: 시나리오
  scenario: string;
  feedback: string;
  feedbackOptions: { [key: string]: boolean }; // 체크박스 옵션
  autoStandards: AutoStandard[]; // AI 자동 선택 성취기준
  step3Valid: boolean;
  
  // Step 4: 지도안
  plan: string;
  validation: {
    subjectsCount: number;
    standardsCount: number;
    sessionsCount: number;
    isValid: boolean;
  };
  step4Valid: boolean;
}

// 액션 타입
type LessonActions = {
  setCurrentStep: (step: LessonState["currentStep"]) => void;
  nextStep: () => void;
  prevStep: () => void;
  validateStep: (step: number, isValid: boolean, errorMessage?: string) => void;
  
  setKeywords: (keywords: string[]) => void;
  setGradeBand: (gradeBand: LessonState["gradeBand"]) => void;
  setStep1Valid: (valid: boolean) => void;
  
  setIdeas: (ideas: LessonIdea[]) => void;
  setSelectedIdea: (idea: LessonIdea | null) => void;
  setStep2Valid: (valid: boolean) => void;
  
  setScenario: (scenario: string) => void;
  setFeedback: (feedback: string) => void;
  setFeedbackOptions: (options: { [key: string]: boolean }) => void;
  setAutoStandards: (standards: AutoStandard[]) => void;
  setStep3Valid: (valid: boolean) => void;
  
  setPlan: (plan: string) => void;
  setValidation: (validation: LessonState["validation"]) => void;
  setStep4Valid: (valid: boolean) => void;
  
  reset: () => void;
};

export type UseLessonStore = LessonState & LessonActions;

export const useLessonStore = create<UseLessonStore>((set, get) => ({
  // 초기 상태
  currentStep: 1,
  stepValidation: { 1: { isValid: false }, 2: { isValid: false }, 3: { isValid: false }, 4: { isValid: false } },
  
  keywords: [],
  gradeBand: "",
  step1Valid: false,
  
  ideas: [],
  selectedIdea: null,
  step2Valid: false,
  
  scenario: "",
  feedback: "",
  feedbackOptions: {},
  autoStandards: [],
  step3Valid: false,
  
  plan: "",
  validation: { subjectsCount: 0, standardsCount: 0, sessionsCount: 0, isValid: false },
  step4Valid: false,

  // 네비게이션 액션들
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const state = get();
    const currentValidation = state.stepValidation[state.currentStep];
    if (!currentValidation.isValid) {
      alert(`Step ${state.currentStep}의 데이터가 유효하지 않습니다.`);
      return;
    }
    const next = state.currentStep + 1 as LessonState["currentStep"];
    if (next <= 4) {
      set({ currentStep: next });
    }
  },
  prevStep: () => {
    const state = get();
    const prev = state.currentStep - 1 as LessonState["currentStep"];
    if (prev >= 1) {
      set({ currentStep: prev });
    }
  },
  validateStep: (step, isValid, errorMessage) => {
    set((state) => ({
      stepValidation: {
        ...state.stepValidation,
        [step]: { isValid, errorMessage },
      },
    }));
  },

  // 기존 액션들
  setKeywords: (keywords) => set({ keywords }),
  setGradeBand: (gradeBand) => set({ gradeBand }),
  setStep1Valid: (valid) => set({ step1Valid: valid }),
  
  setIdeas: (ideas) => set({ ideas }),
  setSelectedIdea: (selectedIdea) => set({ selectedIdea }),
  setStep2Valid: (valid) => set({ step2Valid: valid }),
  
  setScenario: (scenario) => set({ scenario }),
  setFeedback: (feedback) => set({ feedback }),
  setFeedbackOptions: (feedbackOptions) => set({ feedbackOptions }),
  setAutoStandards: (autoStandards) => set({ autoStandards }),
  setStep3Valid: (valid) => set({ step3Valid: valid }),
  
  setPlan: (plan) => set({ plan }),
  setValidation: (validation) => set({ validation }),
  setStep4Valid: (valid) => set({ step4Valid: valid }),
  
  reset: () => set({
    currentStep: 1,
    stepValidation: { 1: { isValid: false }, 2: { isValid: false }, 3: { isValid: false }, 4: { isValid: false } },
    keywords: [],
    gradeBand: "",
    step1Valid: false,
    ideas: [],
    selectedIdea: null,
    step2Valid: false,
    scenario: "",
    feedback: "",
    feedbackOptions: {},
    autoStandards: [],
    step3Valid: false,
    plan: "",
    validation: { subjectsCount: 0, standardsCount: 0, sessionsCount: 0, isValid: false },
    step4Valid: false,
  }),
}));