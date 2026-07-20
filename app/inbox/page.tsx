"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { PriorityBadge, SourceBadge } from "@/components/ui";
import { InboxItem, Proposal } from "@/lib/types";

export default function InboxPage() {
  const { ready, project, projectInbox, updateInbox, addTask } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [engine, setEngine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const selected = projectInbox.find((i) => i.id === selectedId) ?? projectInbox[0] ?? null;

  const analyze = async (item: InboxItem) => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: item.content,
          memberNames: project.members.map((m) => m.name),
          today: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      setEngine(result.engine);
      updateInbox(item.id, {
        status: "analyzed",
        aiSummary: result.summary,
        proposals: result.proposals.map((p: Omit<Proposal, "id" | "accepted">, idx: number) => ({
          ...p,
          id: `${item.id}-pr${idx}`,
          accepted: null,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const acceptProposal = async (item: InboxItem, proposal: Proposal) => {
    const assignee = proposal.assigneeName
      ? project.members.find((m) => m.name === proposal.assigneeName)
      : null;
    await addTask({
      title: proposal.title,
      description: proposal.description + (proposal.description ? "\n\n" : "") + `出典: ${item.title} (${item.datetime})`,
      priority: proposal.priority,
      assigneeId: assignee?.id ?? null,
      dueDate: proposal.dueDate,
      startDate: new Date().toISOString().slice(0, 10),
      source: item.source,
      sourceLabel: item.title,
      tags: ["AI抽出"],
    });
    await markProposal(item, proposal.id, true);
  };

  const markProposal = async (item: InboxItem, proposalId: string, accepted: boolean) => {
    const proposals = item.proposals.map((p) =>
      p.id === proposalId ? { ...p, accepted } : p
    );
    const allJudged = proposals.every((p) => p.accepted !== null);
    await updateInbox(item.id, { proposals, status: allJudged ? "done" : "analyzed" });
  };

  const acceptAllPending = async (item: InboxItem) => {
    const pending = item.proposals.filter((p) => p.accepted === null);
    for (const p of pending) {
      const assignee = p.assigneeName
        ? project.members.find((m) => m.name === p.assigneeName)
        : null;
      // Firestore への書き込み順を保証するため直列に await する
      await addTask({
        title: p.title,
        description: p.description + (p.description ? "\n\n" : "") + `出典: ${item.title} (${item.datetime})`,
        priority: p.priority,
        assigneeId: assignee?.id ?? null,
        dueDate: p.dueDate,
        startDate: new Date().toISOString().slice(0, 10),
        source: item.source,
        sourceLabel: item.title,
        tags: ["AI抽出"],
      });
    }
    await updateInbox(item.id, {
      proposals: item.proposals.map((p) =>
        p.accepted === null ? { ...p, accepted: true } : p
      ),
      status: "done",
    });
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-bold">連携インボックス</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Google カレンダーの議事メモ・Google Chat から取り込んだ情報を AI が解析し、タスク候補を提案します。承認するとWBSに自動反映されます。
        </p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 左: アイテムリスト */}
        <div className="w-72 shrink-0 space-y-2 overflow-y-auto">
          {projectInbox.length === 0 && (
            <p className="text-sm text-slate-400 p-4">連携アイテムはありません</p>
          )}
          {projectInbox.map((item) => (
            <button
              key={item.id}
              className={`w-full text-left bg-white rounded-lg border p-3 transition-colors ${
                selected?.id === item.id
                  ? "border-indigo-400 ring-1 ring-indigo-300"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="flex items-center gap-1.5">
                <SourceBadge source={item.source} />
                {item.status === "new" && (
                  <span className="bg-rose-100 text-rose-600 text-[10px] font-bold rounded px-1.5 py-0.5">NEW</span>
                )}
                {item.status === "done" && (
                  <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded px-1.5 py-0.5">処理済</span>
                )}
              </div>
              <div className="text-sm font-medium mt-1.5 leading-snug">{item.title}</div>
              <div className="text-[11px] text-slate-400 mt-1">{item.datetime}</div>
            </button>
          ))}
        </div>

        {/* 右: 詳細 */}
        {selected ? (
          <div className="flex-1 min-w-0 grid grid-rows-[auto_1fr] gap-4 overflow-hidden">
            <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-hidden flex flex-col max-h-[45%] row-span-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-sm">{selected.title}</div>
                  <div className="text-[11px] text-slate-400">
                    {selected.author} ・ {selected.datetime}
                  </div>
                </div>
                <button
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md px-4 py-2 shrink-0"
                  disabled={analyzing}
                  onClick={() => analyze(selected)}
                  data-testid="analyze-btn"
                >
                  {analyzing ? "解析中…" : selected.status === "new" ? "✨ AIで解析" : "✨ 再解析"}
                </button>
              </div>
              <pre className="flex-1 overflow-y-auto text-xs text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap font-sans">
                {selected.content}
              </pre>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto">
              {error && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-md p-3">
                  解析エラー: {error}
                </div>
              )}
              {selected.aiSummary ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-sm">🤖 AI要約</h3>
                    {engine && (
                      <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                        {engine === "gemini" ? "Gemini" : "簡易解析 (APIキー未設定)"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 bg-indigo-50/60 rounded-lg p-3 mb-4">
                    {selected.aiSummary}
                  </p>
                  <h3 className="font-bold text-sm mb-2">
                    📌 タスク候補 ({selected.proposals.length})
                  </h3>
                  <div className="space-y-2">
                    {selected.proposals.length === 0 && (
                      <p className="text-sm text-slate-400">タスク候補は抽出されませんでした</p>
                    )}
                    {selected.proposals.map((p) => (
                      <div
                        key={p.id}
                        className={`border rounded-lg p-3 flex items-start gap-3 ${
                          p.accepted === true
                            ? "border-emerald-300 bg-emerald-50/50"
                            : p.accepted === false
                            ? "border-slate-200 bg-slate-50 opacity-60"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{p.title}</div>
                          {p.description && (
                            <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                            <PriorityBadge priority={p.priority} />
                            {p.assigneeName && <span>👤 {p.assigneeName}</span>}
                            {p.dueDate && <span>📅 {p.dueDate}</span>}
                          </div>
                        </div>
                        {p.accepted === true ? (
                          <span className="text-emerald-600 text-xs font-bold shrink-0 mt-1">
                            ✓ WBSに追加済
                          </span>
                        ) : p.accepted === false ? (
                          <span className="text-slate-400 text-xs shrink-0 mt-1">却下</span>
                        ) : (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md px-3 py-1.5"
                              onClick={() => acceptProposal(selected, p)}
                            >
                              承認
                            </button>
                            <button
                              className="border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs rounded-md px-3 py-1.5"
                              onClick={() => markProposal(selected, p.id, false)}
                            >
                              却下
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {selected.proposals.some((p) => p.accepted === null) && (
                    <button
                      className="mt-3 text-xs text-indigo-600 hover:underline"
                      onClick={() => acceptAllPending(selected)}
                    >
                      残りをすべて承認してWBSに追加
                    </button>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-8">
                  <span className="text-4xl mb-3">✨</span>
                  <p className="text-sm">
                    「AIで解析」を押すと、内容の要約と<br />
                    アクションアイテムのタスク候補を抽出します
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            アイテムを選択してください
          </div>
        )}
      </div>
    </div>
  );
}
