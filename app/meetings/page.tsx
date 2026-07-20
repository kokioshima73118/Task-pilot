"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";

export default function MeetingsPage() {
  const {
    ready,
    project,
    projectMeetingSources,
    invitedEvents,
    addMeetingSource,
    updateMeetingSource,
    removeMeetingSource,
    syncMeetings,
  } = useStore();
  const [pattern, setPattern] = useState("");
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // 招待会議を「会議名」でグルーピング (定例は複数回開催されるため)
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of invitedEvents) {
      const arr = map.get(ev.title) ?? [];
      arr.push(ev);
      map.set(ev.title, arr);
    }
    return Array.from(map.entries()).map(([title, events]) => ({ title, events }));
  }, [invitedEvents]);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const isRegistered = (ev: CalendarEvent) =>
    projectMeetingSources.some((s) =>
      s.type === "event" ? s.eventTitle === ev.title : !!s.namePattern && ev.title.includes(s.namePattern)
    );

  const runSync = async () => {
    const n = await syncMeetings();
    setSyncMsg(n > 0 ? `${n} 件の議事メモをインボックスに取り込みました` : "新しく取り込める議事メモはありませんでした");
    setTimeout(() => setSyncMsg(null), 5000);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-bold">会議連携の設定</h1>
        <button
          onClick={runSync}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md px-4 py-2"
        >
          🔄 今すぐ同期
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-2">
        {project.name} — このプロジェクトで情報を読み込む会議を設定します。設定した会議の議事メモは連携インボックスに取り込まれ、AIでタスク化できます。
      </p>
      {syncMsg && (
        <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          {syncMsg}
        </div>
      )}

      {/* 登録済みソース */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <h2 className="font-bold text-sm mb-3">読み込み対象の会議 ({projectMeetingSources.length})</h2>
        {projectMeetingSources.length === 0 && (
          <p className="text-sm text-slate-400">まだ設定されていません。下の一覧から会議を追加してください。</p>
        )}
        <div className="space-y-2">
          {projectMeetingSources.map((s) => (
            <div key={s.id} className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5">
              <span className="text-lg">{s.type === "recurring" ? "🔁" : "📌"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-[11px] text-slate-400">
                  {s.type === "recurring"
                    ? `名称一致「${s.namePattern}」を含む定例を自動対象`
                    : "指定した会議のみ"}
                  {s.lastSyncedAt && ` ・ 最終同期 ${s.lastSyncedAt.slice(0, 10)}`}
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={s.autoImport}
                  onChange={(e) => updateMeetingSource(s.id, { autoImport: e.target.checked })}
                />
                自動読み込み
              </label>
              <button
                className="text-xs text-red-500 hover:underline"
                onClick={() => removeMeetingSource(s.id)}
              >
                解除
              </button>
            </div>
          ))}
        </div>

        {/* 定例を名称で登録 */}
        <form
          className="mt-4 pt-4 border-t border-slate-100 flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const p = pattern.trim();
            if (!p) return;
            addMeetingSource({ type: "recurring", label: p, namePattern: p, autoImport: true });
            setPattern("");
          }}
        >
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500">🔁 定例MTGを名称で登録 (自動読み込み)</label>
            <input
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="例: 週次定例MTG、スプリントレビュー"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              data-testid="pattern-input"
            />
          </div>
          <button className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-md px-4 py-2">
            登録
          </button>
        </form>
        <p className="text-[11px] text-slate-400 mt-1.5">
          名称が一致する会議は、新しい回が開催されるたびに自動でインボックスへ取り込まれます。
        </p>
      </section>

      {/* 招待されている会議一覧 */}
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-bold text-sm mb-1">あなたが招待されている会議</h2>
        <p className="text-[11px] text-slate-400 mb-3">
          Google カレンダーから、あなたが参加者に含まれる会議を表示しています。読み込み対象に追加できます。
        </p>
        <div className="space-y-2">
          {grouped.map(({ title, events }) => {
            const registered = isRegistered(events[0]);
            const withNotes = events.filter((e) => e.hasNotes).length;
            const recurring = events[0].recurring || events.length > 1;
            return (
              <div key={title} className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5">
                <span className="text-lg">{recurring ? "🔁" : "📅"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {title}
                    {recurring && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5">定例</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {events.length}回開催 ・ 議事メモ {withNotes}件
                    {" ・ 直近 "}
                    {events[0].datetime}
                  </div>
                </div>
                {registered ? (
                  <span className="text-xs text-emerald-600 font-medium">✓ 設定済み</span>
                ) : (
                  <button
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-md px-3 py-1.5"
                    onClick={() =>
                      addMeetingSource(
                        recurring
                          ? { type: "recurring", label: title, namePattern: title, autoImport: true }
                          : { type: "event", label: title, eventTitle: title, autoImport: false }
                      )
                    }
                  >
                    ＋ 対象に追加
                  </button>
                )}
              </div>
            );
          })}
          {grouped.length === 0 && (
            <p className="text-sm text-slate-400">招待されている会議はありません。</p>
          )}
        </div>
      </section>
    </div>
  );
}
