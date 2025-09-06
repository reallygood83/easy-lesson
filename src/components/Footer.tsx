"use client";

export default function Footer() {
  return (
    <footer className="bg-rose-100 border-t border-rose-200 mt-8 pt-4 pb-4">
      <div className="mx-auto max-w-6xl px-4 text-center text-xs text-ink/70">
        <div className="flex flex-row gap-4 justify-center items-center mb-1">
          <a href="https://www.youtube.com/@배움의달인-p5v" target="_blank" rel="noopener noreferrer" className="hover:text-rose-300">
            배움의달인
          </a>
          <span> | </span>
          <a href="https://open.kakao.com/o/gubGYQ7g" target="_blank" rel="noopener noreferrer" className="hover:text-rose-300">
            오픈채팅방
          </a>
        </div>
        <p className="text-ink font-semibold text-base" style={{fontSize: '1.2em'}}>© 2025 Moon-Jung Kim | AI 융합교육 수업지도안 자동 생성 도구</p>
      </div>
    </footer>
  );
}