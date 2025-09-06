self.onmessage = async (e: MessageEvent<{ filePath: string; gradeBand: "1-2" | "3-4" | "5-6" }>) => {
  const { filePath, gradeBand } = e.data;

  try {
    // MD 파일 직접 fetch (클라이언트에서 접근 가능하도록)
    const response = await fetch(filePath);
    if (!response.ok) {
      self.postMessage({ error: "파일 로드 실패" });
      return;
    }
    const mdContent = await response.text();

    // 2015/2022 파서 로직 (기존 route.ts에서 가져옴)
    const items = parseStandards(mdContent, gradeBand);
    
    // 결과 전송
    self.postMessage({ items });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// 파싱 함수들 (기존 route.ts 로직 복사)
function cleanText(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type StandardItem = {
  framework: "2015" | "2022";
  subject: string;
  gradeBand: "1-2" | "3-4" | "5-6";
  code: string;
  statement: string;
};

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
        const pair = `${a}-${b}`;
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

function parseStandards(mdContent: string, gradeBand: "1-2" | "3-4" | "5-6"): StandardItem[] {
  let items: StandardItem[] = [];
  
  // 2015 파서 호출 (파일 경로가 5-6학년인 경우)
  if (gradeBand === "5-6") {
    items = parse2015(mdContent);
  } else {
    // 2022 파서 호출 (1-4학년)
    items = parse2022(mdContent);
  }

  // Deduplicate and sort
  const seen = new Set<string>();
  const unique = items.filter((it: StandardItem) => {
    const key = `${it.framework}:${it.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a: StandardItem, b: StandardItem) => {
    if (a.framework !== b.framework) return a.framework.localeCompare(b.framework);
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject, "ko");
    if (a.gradeBand !== b.gradeBand) return a.gradeBand.localeCompare(b.gradeBand);
    return a.code.localeCompare(b.code, "ko");
  });

  return unique;
}