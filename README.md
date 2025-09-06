# AI 융합교육 수업지도안 도구

초등학교 교사를 위한 AI 기반 융합교육 프로젝트 수업 아이디어, 시나리오, 지도안을 자동 생성하는 웹 애플리케이션입니다. Google Gemini 2.5-flash를 활용하여 3단계 마법사 워크플로우로 구성되어 있습니다.

## 기능

- **1단계: 프로젝트 아이디어 생성** - 키워드와 학년 입력으로 AI가 3개 융합 프로젝트 아이디어 생성
- **2단계: 융합교육 시나리오** - 자동 성취기준 선택과 시나리오 생성, 교사 피드백 반영
- **3단계: 수업지도안 생성** - 2025 워크시트 형식으로 3차시 지도안 자동 생성
- **내보내기** - Markdown, PDF, DOCX 형식 지원
- **성능 최적화** - 웹 워커를 통한 성취기준 파싱, Zustand 상태 관리

## 기술 스택

- **Frontend**: Next.js 15.5.2 (App Router), TypeScript, Tailwind CSS
- **State Management**: Zustand
- **AI Integration**: Google Gemini 2.5-flash API
- **Export**: html2pdf.js (PDF), docx (DOCX)
- **Performance**: Web Workers for standards parsing
- **Deployment**: Vercel

## 설치 및 실행

### 개발 환경 설정

1. **의존성 설치**
```bash
cd ai-lesson-planner
npm install
```

2. **Gemini API 키 설정**
   - 브라우저 개발자 도구 > Application > Local Storage에서 `gemini-api-key` 키로 API 키 저장
   - 또는 Settings 페이지에서 직접 입력

3. **개발 서버 실행**
```bash
npm run dev
```
- http://localhost:3000 에서 접속

### 배포

- Vercel에 연결되어 자동 배포됨
- GitHub 리포지토리: https://github.com/reallygood83/easy-lesson

## 사용 방법

### 1단계: 프로젝트 아이디어 생성
- 키워드 (예: "로봇, 환경, 팀워크")와 학년군 선택
- "AI 아이디어 생성하기" 클릭
- 3개 추천 프로젝트 중 하나 선택

### 2단계: 융합교육 시나리오
- 자동으로 관련 성취기준 2개 이상 선택
- "시나리오 생성하기" 클릭
- 필요시 피드백으로 수정 (난이도, AI 윤리 등)

### 3단계: 수업지도안 생성
- 검증 결과 확인 (교과 2개+, 성취기준 2개+)
- "워크시트 형식 수업지도안 생성" 클릭
- 섹션별 복사 및 Markdown/PDF/DOCX 내보내기

## 파일 구조

```
ai-lesson-planner/
├── src/app/
│   ├── idea/page.tsx          # 1단계: 아이디어 생성
│   ├── scenario/page.tsx      # 2단계: 시나리오 생성
│   ├── plan/page.tsx          # 3단계: 지도안 생성
│   ├── page.tsx               # 홈페이지 (Wizard 시작)
│   └── api/standards/route.ts # 성취기준 파싱 API
├── src/components/
│   ├── Wizard.tsx             # 마법사 네비게이션
│   ├── NavBar.tsx             # 상단 네비게이션
│   └── Footer.tsx             # 하단 푸터
├── src/store/useLessonStore.ts # Zustand 상태 관리
├── src/lib/gemini.ts          # Gemini API 어댑터
└── src/workers/standards.worker.ts # 성취기준 파싱 웹 워커
```

## 성취기준 파일

- `2015 성취기준 5-6학년 .md` - 2015 교육과정 5-6학년
- `2022 개정 교육과정 초등학교 성취기준 .md` - 2022 교육과정 전체

프로젝트 루트 디렉토리에 위치해야 합니다.

## 문제 해결

### API 키 오류
- Settings 페이지에서 Gemini API 키 확인
- localStorage에 `gemini-api-key` 키로 저장

### 성취기준 로드 실패
- MD 파일 경로 확인: `/Users/moon/Desktop/newcu/` 기준
- 파일 인코딩: UTF-8 확인

### PDF/DOCX 내보내기 오류
- 브라우저 호환성 확인 (Chrome 권장)
- 큰 파일의 경우 메모리 확인

## 배포 노트

- Vercel 자동 배포 설정됨
- 환경변수: `NEXT_PUBLIC_GEMINI_API_KEY` (선택사항)
- 빌드 명령: `npm run build`
- 시작 명령: `npm start`

## 라이선스

MIT License
