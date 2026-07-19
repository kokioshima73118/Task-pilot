import { NextRequest, NextResponse } from "next/server";

interface AnalyzeRequest {
  content: string;
  memberNames: string[];
  today: string; // YYYY-MM-DD
}

interface ProposalOut {
  title: string;
  description: string;
  assigneeName: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
}

interface AnalyzeResult {
  summary: string;
  proposals: ProposalOut[];
  engine: "gemini" | "fallback";
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AnalyzeRequest;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const result = await analyzeWithGemini(apiKey, body);
      return NextResponse.json(result);
    } catch (e) {
      console.error("Gemini API error, falling back:", e);
    }
  }
  return NextResponse.json(analyzeFallback(body));
}

async function analyzeWithGemini(
  apiKey: string,
  { content, memberNames, today }: AnalyzeRequest
): Promise<AnalyzeResult> {
  const prompt = `あなたはプロジェクトマネジメントのアシスタントです。以下の議事メモまたはチャットログを分析し、JSONのみで回答してください。

今日の日付: ${today}
プロジェクトメンバー: ${memberNames.join(", ")}

出力形式:
{
  "summary": "内容の要約(2〜3文、日本語)",
  "proposals": [
    {
      "title": "タスクのタイトル(簡潔な日本語)",
      "description": "補足説明",
      "assigneeName": "メンバー名(上記リストから一致する人。不明ならnull)",
      "dueDate": "YYYY-MM-DD形式(「今週中」「金曜」等の相対表現は今日の日付から計算。不明ならnull)",
      "priority": "high | medium | low"
    }
  ]
}

アクションアイテム・TODO・依頼事項をすべてタスク候補として抽出してください。決定事項や単なる報告はタスクにしないでください。

--- 分析対象 ---
${content}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text);
  return {
    summary: String(parsed.summary ?? ""),
    proposals: (Array.isArray(parsed.proposals) ? parsed.proposals : []).map(
      (p: Record<string, unknown>) => ({
        title: String(p.title ?? ""),
        description: String(p.description ?? ""),
        assigneeName: p.assigneeName ? String(p.assigneeName) : null,
        dueDate: p.dueDate ? String(p.dueDate) : null,
        priority: (["high", "medium", "low"].includes(String(p.priority))
          ? String(p.priority)
          : "medium") as ProposalOut["priority"],
      })
    ),
    engine: "gemini",
  };
}

/**
 * GEMINI_API_KEY 未設定時のルールベース抽出。
 * 「〜する」「対応」「お願いします」「必要」などの行をアクションとみなす。
 */
function analyzeFallback({ content, memberNames, today }: AnalyzeRequest): AnalyzeResult {
  const lines = content
    .split("\n")
    .map((l) => l.replace(/^[-*・\s]+/, "").replace(/^\[\d{2}:\d{2}\]\s*/, "").trim())
    .filter((l) => l.length > 4);

  const actionPatterns =
    /(する必要|が必要|してください|お願いします|お願いしよう|対応(する|が必要)?|作成(する|します)?|調査(する|して)|報告(する|します)|タスク化|レビュー(入って|お願い)|書きます|やります|実施(する)?)/;

  const proposals: ProposalOut[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (!actionPatterns.test(line)) continue;
    if (/決定|完了しました|承認された/.test(line)) continue;

    // 話者プレフィックス (「佐藤 健太:」「佐藤さんより:」) を除去しつつ担当者を推定
    let assignee: string | null = null;
    let text = line;
    for (const name of memberNames) {
      const surname = name.split(/\s+/)[0];
      if (line.includes(surname)) {
        assignee = name;
        break;
      }
    }
    text = text.replace(/^[^:：]{1,12}[:：]\s*/, "");

    const title = text.length > 42 ? text.slice(0, 42) + "…" : text;
    if (seen.has(title)) continue;
    seen.add(title);

    proposals.push({
      title,
      description: line !== text ? line : "",
      assigneeName: assignee,
      dueDate: estimateDueDate(line, today),
      priority: /優先度高|至急|急ぎ|今週中/.test(line) ? "high" : "medium",
    });
    if (proposals.length >= 6) break;
  }

  const firstLines = lines.slice(0, 3).join(" / ");
  return {
    summary: `(簡易解析) ${firstLines.slice(0, 120)}${firstLines.length > 120 ? "…" : ""}`,
    proposals,
    engine: "fallback",
  };
}

function estimateDueDate(line: string, today: string): string | null {
  const base = new Date(today + "T00:00:00");
  const add = (days: number) => {
    const t = new Date(base);
    t.setDate(t.getDate() + days);
    return t.toISOString().slice(0, 10);
  };
  if (/今日/.test(line)) return add(0);
  if (/明日/.test(line)) return add(1);
  if (/今週中|週内/.test(line)) return add((5 - base.getDay() + 7) % 7 || 5);
  if (/金曜/.test(line)) return add((5 - base.getDay() + 7) % 7 || 7);
  if (/火曜/.test(line)) return add((2 - base.getDay() + 7) % 7 || 7);
  if (/来週/.test(line)) return add(7);
  if (/今月末|月末/.test(line)) {
    const t = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return t.toISOString().slice(0, 10);
  }
  return null;
}
