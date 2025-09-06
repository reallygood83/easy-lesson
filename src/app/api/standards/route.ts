import { NextResponse } from "next/server";
import fs from "fs";

export const runtime = "nodejs";

// Absolute paths to source Markdown files on the user's machine
const PATH_2015 = "./2015 성취기준 5-6학년 .md";
const PATH_2022 = "./2022 개정 교육과정 초등학교 성취기준 .md";

export type StandardItem = {
  framework: "2015" | "2022";
  subject: string; // e.g., 국어, 사회
  gradeBand: "1-2" | "3-4" | "5-6";
  code: string; // e.g., 6국01-01
  statement: string;
};

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

  if (!txt2015 && !txt2022) {
    return NextResponse.json(
      { error: "기준 파일을 찾을 수 없습니다. 경로를 확인해 주세요.", paths: { PATH_2015, PATH_2022 } },
      { status: 500 }
    );
  }

  let items: StandardItem[] = [];
  try {
    if (txt2015) items = items.concat(parse2015(txt2015));
    if (txt2022) items = items.concat(parse2022(txt2022));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "파싱 중 오류" }, { status: 500 });
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
  };

  return NextResponse.json({ items: unique, meta });
}