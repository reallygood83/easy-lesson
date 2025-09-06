import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🪄 AI 융합 수업지도안 도구",
  description:
    "초등 교사를 위한 AI융합 프로젝트 수업 아이디어·시나리오·지도안 자동 생성 도구. 키워드와 학년만 입력하면 3단계 마법사로 완전한 수업지도안을 자동 생성합니다.",
  keywords: ["AI", "수업지도안", "초등교육", "융합교육", "교사도구", "수업설계"],
  authors: [{ name: "AI 교육도구 개발팀" }],
  creator: "AI 교육도구 개발팀",
  publisher: "AI 교육도구 개발팀",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", sizes: "32x32", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "🪄 AI 융합 수업지도안 도구",
    description: "초등 교사를 위한 AI융합 프로젝트 수업 설계 자동화 도구",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "🪄 AI 융합 수업지도안 도구",
    description: "초등 교사를 위한 AI융합 프로젝트 수업 설계 자동화 도구",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#ff8c42",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-warm text-ink`}>        
        <NavBar />
        <main className="min-h-[calc(100vh-56px)] relative overflow-x-hidden">
          {/* 팔레트 느낌의 배경 효과 */}
          <div aria-hidden className="palette-bg" />
          <div className="relative z-10 px-6 py-10 sm:px-8 md:px-12">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
