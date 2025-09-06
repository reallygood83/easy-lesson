import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// Use project data directory so files are packaged and available on Vercel
const DATA_DIR = path.join(process.cwd(), "data");
const PATH_2015 = path.join(DATA_DIR, "2015 성취기준 5-6학년 .md");
const PATH_2022 = path.join(DATA_DIR, "2022 개정 교육과정 초등학교 성취기준 .md");

export type StandardItem = {
  framework: "2015" | "2022";
  subject: string; // e.g., 국어, 사회
  gradeBand: "1-2" | "3-4" | "5-6";
  code: string; // e.g., 6국01-01
  statement: string;
};

// Minimal fallback dataset to keep UX functional when files are unavailable (e.g., Vercel)
const FALLBACK_ITEMS: StandardItem[] = [
  { framework: "2022", subject: "국어", gradeBand: "5-6", code: "6국01-01", statement: "다양한 주제에 대해 자료를 수집·정리하여 자신의 관점을 논리적으로 말하고 글로 표현한다." },
  { framework: "2022", subject: "사회", gradeBand: "5-6", code: "6사01-02", statement: "세계 여러 지역의 자연·문화적 특성을 조사하여 상호이해와 문화 다양성의 가치를 이해한다." },
  { framework: "2022", subject: "과학", gradeBand: "5-6", code: "6과01-03", statement: "과학적 탐구 과정을 통해 주변 현상에 대한 가설을 세우고 검증한다." },
  { framework: "2022", subject: "실과", gradeBand: "5-6", code: "6실01-02", statement: "정보기술을 활용하여 문제를 해결하고 결과물을 설계·제작한다." },
  { framework: "2022", subject: "사회", gradeBand: "3-4", code: "4사01-01", statement: "지역 사회의 다양한 문화를 이해하고 존중하는 태도를 기른다." },
  { framework: "2022", subject: "국어", gradeBand: "3-4", code: "4국01-02", statement: "상황과 목적에 맞게 듣고 말하는 기본 전략을 사용한다." },
];

function safeRead(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch {}
  return null;
}

function cleanText(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parse2015(md: string): StandardItem[] {
  const items: StandardItem[] = [];
  const lines = md.split(/\r?\n/);
  let currentSubject = "";
  const gradeBand: StandardItem["gradeBand"] = "5-6";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Subject header like: # **1. 국어**
    const subjMatch = line.match(/^#\s*[*_`]*\s*\d+\.?\s*([^*`]+?)[*_`]*\s*$/);
    if (subjMatch) {
      currentSubject = cleanText(subjMatch[1]).replace(/\s+/g, "");
      continue;
    }

    // Code line like: * [6국01-01] 설명...
    const codeMatch = line.match(/\[\s*([^\]]+?)\s*\]\s*(.+)$/);
    if (codeMatch && currentSubject) {
      const code = cleanText(codeMatch[1]);
      const statement = cleanText(codeMatch[2]);
      // Quick guard: code should contain 한글 과목 약어와 숫자
      if (/\d+[가-힣]+\d{2}-\d{2}/.test(code)) {
        items.push({ framework: "2015", subject: currentSubject, gradeBand, code, statement });
      }
    }
  }
  return items;
}

function parse2022(md: string): StandardItem[] {
  const items: StandardItem[] = [];
  const lines = md.split(/\r?\n/);
  let currentSubject = "";
  let currentBand: StandardItem["gradeBand"] | "" = "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Subject header like: ## **2022 ... (국어)**
    const subjMatch = line.match(/\(\s*([^)]+?)\s*\)\s*$/);
    if (line.startsWith("##") && subjMatch) {
      currentSubject = cleanText(subjMatch[1]).replace(/\s+/g, "");
      continue;
    }

    // Grade band header like: ### **초등학교 1\~2학년**
    if (line.startsWith("###") && /초등학교/.test(line)) {
      const bandMatch = line.match(/초등학교\s*(\d+)\s*\\?~\s*(\d+)학년/);
      if (bandMatch) {
        const a = bandMatch[1];
        const b = bandMatch[2];
        const pair = `${a}-${b}` as StandardItem["gradeBand"];
        if (pair === "1-2" || pair === "3-4" || pair === "5-6") {
          currentBand = pair;
        } else {
          currentBand = "";
        }
      }
      continue;
    }

    // Code line like: * **[2국01-01]** 설명...
    const codeMatch = line.match(/\[\s*([^\]]+?)\s*\]\s*(.+)$/);
    if (codeMatch && currentSubject && currentBand) {
      const code = cleanText(codeMatch[1]);
      const statement = cleanText(codeMatch[2]);
      if (/\d+[가-힣]+\d{2}-\d{2}/.test(code)) {
        items.push({ framework: "2022", subject: currentSubject, gradeBand: currentBand, code, statement });
      }
    }
  }
  return items;
}

export async function GET() {
  const txt2015 = safeRead(PATH_2015);
  const txt2022 = safeRead(PATH_2022);

  let items: StandardItem[] = [];
  try {
    if (txt2015) items = items.concat(parse2015(txt2015));
    if (txt2022) items = items.concat(parse2022(txt2022));

    // If no files available, use fallback dataset instead of 500 error
    if (!txt2015 && !txt2022) {
      items = FALLBACK_ITEMS;
    }
  } catch {
    // On parsing error, still try to return fallback to keep UI functional
    items = FALLBACK_ITEMS;
  }

  // Deduplicate by (framework+code) in case of duplicates
  const seen = new Set<string>();
  const unique = items.filter((it) => {
    const key = `${it.framework}:${it.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by framework -> subject -> gradeBand -> code
  unique.sort((a, b) => {
    if (a.framework !== b.framework) return a.framework.localeCompare(b.framework);
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject, "ko");
    if (a.gradeBand !== b.gradeBand) return a.gradeBand.localeCompare(b.gradeBand);
    return a.code.localeCompare(b.code, "ko");
  });

  const meta = {
    frameworks: Array.from(new Set(unique.map((x) => x.framework))).sort(),
    subjects: Array.from(new Set(unique.map((x) => x.subject))).sort((a, b) => a.localeCompare(b, "ko")),
    gradeBands: Array.from(new Set(unique.map((x) => x.gradeBand))).sort(),
    count: unique.length,
    fallback: !txt2015 && !txt2022,
  } as const;

  return NextResponse.json({ items: unique, meta });
}