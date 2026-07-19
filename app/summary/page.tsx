"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SourceBadge } from "@/components/ui";

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

function iso(offset: number) {
  const t = new Date();
  t.setDate(t.getDate() + offset);
  return t.toISOString().slice(0, 10);
}

export default function SummaryPage() {
  const { ready, project, projectInbox } = useStore();
  const [from, setFrom] = useState(iso(-14));
  const [to, setTo] = useState(iso(0));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 期間内のインボックスアイテム (会議議事メモ・チャット)
  const itemsInRange = useMemo(() => {
    return projectInbox
      .filter((i) => {
        const day = i.datetime.slice(0, 10);
        return day >= from && day <= to;
      })
      .sort((a, b) => a.datetime.localeCompare(b.datetime));
  }, [projectInbox, from, to]);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "summary",
          from,
          to,
          today: iso(0),
          memberNames: project.members.map((m) => m.name),
          items: itemsInRange.map((i) => ({
            title: i.title,
            datetime: i.datetime,
            source: i.source,
            content: i.content,
          })),
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const preset = (days: number) => {
    setFrom(iso(-days));
    setTo(iso(0));
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-1">期間サマリ</h1>
      <p className="text-sm text-slate-500 mb-4">
        {project.name} — 指定した期間に取り込まれた会議議事メモ・チャットをAIが横断的に整理し、決定事項・アクション・メンバー別の動きにまとめます。
      </p>

      {/* 期間指定 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">開始日</label>
            <input
              type="date"
              className="mt-1 block border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              data-testid="from-date"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">終了日</label>
            <input
              type="date"
              className="mt-1 block border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              data-testid="to-date"
            />
          </div>
          <div className="flex gap-1.5">
            {[
              { label: "今週", days: 7 },
              { label: "2週間", days: 14 },
              { label: "1ヶ月", days: 30 },
            ].map((p) => (
              <button
                key={p.days}
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1 hover:bg-slate-50"
                onClick={() => preset(p.days)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md px-5 py-2"
            disabled={loading || itemsInRange.length === 0}
            onClick={generate}
            data-testid="generate-btn"
          >
            {loading ? "生成中…" : "✨ サマリを生成"}
          </button>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          対象: <span className="font-medium text-slate-700">{itemsInRange.length}件</span> の会議・チャット
          {itemsInRange.length > 0 && (
            <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">
              {itemsInRange.map((i) => (
                <span key={i.id} className="inline-flex items-center gap-1">
                  <SourceBadge source={i.source} />
                  <span className="text-slate-500">{i.title.replace(/ 議事メモ$/, "")}</span>
                </span>
              ))}
            </span>
          )}
          {itemsInRange.length === 0 && (
            <span className="text-amber-600 ml-1">
              — この期間に取り込まれた情報がありません。会議連携の設定・同期を確認してください。
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-md p-3">エラー: {error}</div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="font-bold">🤖 {from} 〜 {to} のサマリ</h2>
            <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
              {result.engine === "gemini" ? "Gemini" : "簡易集計 (APIキー未設定)"}
            </span>
          </div>

          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold text-slate-500 mb-2">概況</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{result.overview}</p>
          </section>

          <div className="grid grid-cols-2 gap-5">
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-500 mb-2">🔑 重要トピック</h3>
              <ul className="space-y-1.5">
                {result.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-indigo-400">•</span>
                    <span>{h}</span>
                  </li>
                ))}
                {result.highlights.length === 0 && <li className="text-sm text-slate-400">なし</li>}
              </ul>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-500 mb-2">✅ 決定・合意事項</h3>
              <ul className="space-y-1.5">
                {result.decisions.map((dv, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>{dv}</span>
                  </li>
                ))}
                {result.decisions.length === 0 && <li className="text-sm text-slate-400">なし</li>}
              </ul>
            </section>
          </div>

          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold text-slate-500 mb-2">
              📌 未対応のアクション ({result.actionItems.length})
            </h3>
            <div className="space-y-1.5">
              {result.actionItems.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm border-b border-slate-50 pb-1.5 last:border-0">
                  <span className="text-amber-500">▸</span>
                  <span className="flex-1">{a.text}</span>
                  {a.assigneeName && (
                    <span className="text-xs text-slate-500 shrink-0">👤 {a.assigneeName}</span>
                  )}
                  {a.dueDate && (
                    <span className="text-xs text-slate-500 shrink-0 tabular-nums">📅 {a.dueDate}</span>
                  )}
                </div>
              ))}
              {result.actionItems.length === 0 && <p className="text-sm text-slate-400">なし</p>}
            </div>
          </section>

          {result.byMember.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-500 mb-3">👥 メンバー別の動き</h3>
              <div className="grid grid-cols-2 gap-4">
                {result.byMember.map((m) => (
                  <div key={m.name}>
                    <div className="text-sm font-medium mb-1">{m.name}</div>
                    <ul className="space-y-1">
                      {m.points.map((p, i) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                          <span className="text-slate-300">-</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="text-center text-slate-400 py-12">
          <span className="text-4xl block mb-3">📈</span>
          期間を指定して「サマリを生成」を押してください
        </div>
      )}
    </div>
  );
}
