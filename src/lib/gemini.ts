"use client";

import { useState } from "react";

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export class GeminiAPI {
  private apiKey: string;
  private baseURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  constructor() {
    this.apiKey = localStorage.getItem("ai_planner_api_key") || "";
    if (!this.apiKey) {
      throw new Error("Gemini API 키가 설정되지 않았습니다. 설정 페이지에서 입력해 주세요.");
    }
  }

  async generateContent(prompt: string, options: { temperature?: number; maxTokens?: number } = {}): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API 오류: ${response.status} ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      return data.candidates[0]?.content.parts[0]?.text || "";
    } catch (error) {
      console.error("[Gemini API Error]", error);
      throw new Error(`Gemini 호출 실패: ${(error as Error).message}`);
    }
  }

  // 스트리밍 지원 (간단한 폴링 방식으로 시뮬레이션, 실제로는 Server-Sent Events 사용 권장)
  async *generateContentStream(prompt: string): AsyncGenerator<string> {
    // 스트리밍 구현은 Gemini API의 streaming endpoint 사용 필요
    // 현재는 비동기 호출로 대체
    const result = await this.generateContent(prompt);
    yield result;
  }
}

// Hook으로 사용하기 위한 커스텀 훅
export function useGemini() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string, options?: { temperature?: number; maxTokens?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const api = new GeminiAPI();
      const result = await api.generateContent(prompt, options);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}