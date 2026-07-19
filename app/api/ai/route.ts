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
  const body = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;

  // 期間サマリモード
  if (body?.mode === "summary") {
    const sreq = body as SummaryRequest;
    if (apiKey) {
      try {
        return NextResponse.json(await summarizeWithGemini(apiKey, sreq));
      } catch (e) {
        console.error("Gemini summary error, falling back:", e);
      }
    }
    return NextResponse.json(summarizeFallback(sreq));
  }

  // 議事メモ解析モード (デフォルト)
  const areq = body as AnalyzeRequest;
  if (apiKey) {
    try {
      return NextResponse.json(await analyzeWithGemini(apiKey, areq));
    } catch (e) {
      console.error("Gemini API error, falling back:", e);
    }
  }
  return NextResponse.json(analyzeFallback(areq));
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

// ===== 期間サマリ =====

interface SummaryItem {
  title: string;
  datetime: string;
  source: "calendar" | "chat";
  content: string;
}

interface SummaryRequest {
  mode: "summary";
  from: string;
  to: string;
  today: string;
  memberNames: string[];
  items: SummaryItem[];
}

interface ActionItemOut {
  text: string;
  assigneeName: string | null;
  dueDate: string | null;
}

interface SummaryResult {
  overview: string;
  highlights: string[];
  decisions: string[];
  actionItems: ActionItemOut[];
  byMember: { name: string; points: string[] }[];
  engine: "gemini" | "fallback";
}

async function summarizeWithGemini(
  apiKey: string,
  { from, to, today, memberNames, items }: SummaryRequest
): Promise<SummaryResult> {
  const corpus = items
    .map((it) => `### ${it.title} (${it.datetime} / ${it.source})\n${it.content}`)
    .join("\n\n");

  const prompt = `あなたはプロジェクトマネジメントのアシスタントです。以下は ${from} 〜 ${to} の期間に取り込まれた会議議事メモ・チャットログです。全体を横断して整理し、JSONのみで回答してください。

今日の日付: ${today}
プロジェクトメンバー: ${memberNames.join(", ")}

出力形式:
{
  "overview": "この期間全体の状況を3〜4文で要約(日本語)",
  "highlights": ["重要トピック・論点(3〜6個)"],
  "decisions": ["この期間に決定・合意された事項"],
  "actionItems": [
    { "text": "未対応のアクション/TODO", "assigneeName": "担当者名(メンバーリストから。不明ならnull)", "dueDate": "YYYY-MM-DD(不明ならnull)" }
  ],
  "byMember": [ { "name": "メンバー名", "points": ["その人に関連する動き・担当事項"] } ]
}

複数の会議・チャットにまたがる情報を統合し、重複は集約してください。

--- 対象データ ---
${corpus}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const p = JSON.parse(text);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  return {
    overview: String(p.overview ?? ""),
    highlights: arr(p.highlights),
    decisions: arr(p.decisions),
    actionItems: (Array.isArray(p.actionItems) ? p.actionItems : []).map(
      (a: Record<string, unknown>) => ({
        text: String(a.text ?? ""),
        assigneeName: a.assigneeName ? String(a.assigneeName) : null,
        dueDate: a.dueDate ? String(a.dueDate) : null,
      })
    ),
    byMember: (Array.isArray(p.byMember) ? p.byMember : []).map(
      (b: Record<string, unknown>) => ({
        name: String(b.name ?? ""),
        points: arr(b.points),
      })
    ),
    engine: "gemini",
  };
}

function summarizeFallback({
  from,
  to,
  today,
  memberNames,
  items,
}: SummaryRequest): SummaryResult {
  const allLines = items.flatMap((it) =>
    it.content
      .split("\n")
      .map((l) => l.replace(/^[-*・#\s]+/, "").replace(/^\[\d{2}:\d{2}\]\s*/, "").trim())
      .filter((l) => l.length > 4)
  );

  const decisions = dedupe(
    allLines.filter((l) => /決定|合意|承認|方針|進める|確定/.test(l))
  ).slice(0, 8);

  const actionPatterns =
    /(する必要|が必要|してください|お願いします|お願いしよう|対応(する|が必要)?|作成(する|します)?|調査(する|して)|報告(する|します)|タスク化|レビュー(入って|お願い)|書きます|やります|実施(する)?|まとめる|整備する|検討)/;
  const actionItems: ActionItemOut[] = [];
  const seenA = new Set<string>();
  for (const line of allLines) {
    if (!actionPatterns.test(line) || /決定|完了しました|承認された/.test(line)) continue;
    let assignee: string | null = null;
    for (const name of memberNames) {
      if (line.includes(name.split(/\s+/)[0])) {
        assignee = name;
        break;
      }
    }
    const text = line.replace(/^[^:：]{1,12}[:：]\s*/, "");
    const key = text.slice(0, 30);
    if (seenA.has(key)) continue;
    seenA.add(key);
    actionItems.push({
      text: text.length > 60 ? text.slice(0, 60) + "…" : text,
      assigneeName: assignee,
      dueDate: estimateDueDate(line, today),
    });
    if (actionItems.length >= 10) break;
  }

  const byMember = memberNames
    .map((name) => {
      const surname = name.split(/\s+/)[0];
      const points = dedupe(allLines.filter((l) => l.includes(surname)))
        .map((l) => (l.length > 70 ? l.slice(0, 70) + "…" : l))
        .slice(0, 4);
      return { name, points };
    })
    .filter((m) => m.points.length > 0);

  const highlights = dedupe(items.map((it) => `${it.title.replace(/ 議事メモ$/, "")}（${it.datetime.slice(0, 10)}）`)).slice(0, 6);

  return {
    overview: `(簡易集計) ${from} 〜 ${to} に ${items.length} 件の会議・チャットを取り込みました。決定事項 ${decisions.length} 件、未対応のアクション ${actionItems.length} 件を検出しました。`,
    highlights,
    decisions,
    actionItems,
    byMember,
    engine: "fallback",
  };
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.slice(0, 24);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
