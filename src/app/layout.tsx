import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "AI 융합 수업지도안 도구",
  description:
    "초등 교사를 위한 AI융합 프로젝트 수업 아이디어·시나리오·지도안 자동 생성 도구",
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
