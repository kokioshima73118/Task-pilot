"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar, SourceBadge, StatusBadge } from "@/components/ui";
import TaskModal from "@/components/TaskModal";
import { Task } from "@/lib/types";

const DAY_W = 28; // 1日あたりの幅(px)

export default function WbsPage() {
  const { ready, project, projectTasks } = useStore();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // WBS ツリー (親→子) を平坦化して行順を決定
  const rows = useMemo(() => {
    const tops = projectTasks.filter((t) => !t.parentId);
    const out: { task: Task; depth: number; hasChildren: boolean }[] = [];
    for (const top of tops) {
      const children = projectTasks.filter((t) => t.parentId === top.id);
      out.push({ task: top, depth: 0, hasChildren: children.length > 0 });
      if (!collapsed.has(top.id)) {
        for (const c of children) out.push({ task: c, depth: 1, hasChildren: false });
      }
    }
    return out;
  }, [projectTasks, collapsed]);

  // タイムライン範囲
  const { rangeStart, days, todayIdx } = useMemo(() => {
    const dates = projectTasks
      .flatMap((t) => [t.startDate, t.dueDate])
      .filter((d): d is string => !!d)
      .sort();
    const today = new Date();
    const start = dates.length ? new Date(dates[0] + "T00:00:00") : today;
    const end = dates.length ? new Date(dates[dates.length - 1] + "T00:00:00") : today;
    start.setDate(start.getDate() - 2);
    end.setDate(end.getDate() + 3);
    const dayCount = Math.max(14, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const tIdx = Math.round(
      (new Date(today.toISOString().slice(0, 10) + "T00:00:00").getTime() - start.getTime()) / 86400000
    );
    return { rangeStart: start, days: dayCount, todayIdx: tIdx };
  }, [projectTasks]);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const findMember = (id: string | null) => project.members.find((m) => m.id === id);

  const dayIdx = (dateStr: string) =>
    Math.round((new Date(dateStr + "T00:00:00").getTime() - rangeStart.getTime()) / 86400000);

  // 月ラベル
  const monthMarks: { idx: number; label: string }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    if (d.getDate() === 1 || i === 0) {
      monthMarks.push({ idx: i, label: `${d.getMonth() + 1}月` });
    }
  }

  return (
    <div className="p-6 flex flex-col h-screen">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">WBS / ガントチャート</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            📅/💬 バッジ付きは連携インボックスから自動反映されたタスクです
          </p>
        </div>
        <button
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md px-4 py-2"
          onClick={() => setCreating(true)}
        >
          ＋ タスク追加
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 flex-1 min-h-0 overflow-auto">
        <div className="flex min-w-max">
          {/* 左: タスクリスト */}
          <div className="sticky left-0 z-10 bg-white border-r border-slate-200 w-[380px] shrink-0">
            <div className="h-9 border-b border-slate-200 flex items-center px-3 text-xs font-bold text-slate-500 sticky top-0 bg-white">
              タスク
            </div>
            {rows.map(({ task, depth, hasChildren }) => (
              <div
                key={task.id}
                className="h-10 border-b border-slate-100 flex items-center gap-1.5 px-3 hover:bg-slate-50 cursor-pointer"
                style={{ paddingLeft: 12 + depth * 22 }}
                onClick={() => setEditing(task)}
              >
                {hasChildren ? (
                  <button
                    className="w-4 text-slate-400 hover:text-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsed((s) => {
                        const n = new Set(s);
                        if (n.has(task.id)) n.delete(task.id);
                        else n.add(task.id);
                        return n;
                      });
                    }}
                  >
                    {collapsed.has(task.id) ? "▸" : "▾"}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <span
                  className={`flex-1 truncate text-sm ${depth === 0 ? "font-bold" : ""} ${
                    task.status === "done" ? "line-through text-slate-400" : ""
                  }`}
                >
                  {task.title}
                </span>
                {task.source !== "manual" && <SourceBadge source={task.source} />}
                <StatusBadge status={task.status} />
                <Avatar member={findMember(task.assigneeId)} size={20} />
              </div>
            ))}
          </div>

          {/* 右: ガントチャート */}
          <div className="relative" style={{ width: days * DAY_W }}>
            {/* 月ヘッダ */}
            <div className="h-9 border-b border-slate-200 relative sticky top-0 bg-white text-xs text-slate-500">
              {monthMarks.map((m) => (
                <span key={m.idx} className="absolute top-2 font-bold" style={{ left: m.idx * DAY_W + 4 }}>
                  {m.label}
                </span>
              ))}
            </div>
            {/* 縦グリッド + 今日ライン */}
            <div className="absolute inset-0 top-9 pointer-events-none">
              {Array.from({ length: days }).map((_, i) => {
                const d = new Date(rangeStart);
                d.setDate(d.getDate() + i);
                const wknd = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`absolute inset-y-0 border-r ${wknd ? "bg-slate-50 border-slate-100" : "border-slate-100"}`}
                    style={{ left: i * DAY_W, width: DAY_W }}
                  />
                );
              })}
              {todayIdx >= 0 && todayIdx < days && (
                <div
                  className="absolute inset-y-0 w-0.5 bg-rose-400 z-10"
                  style={{ left: todayIdx * DAY_W + DAY_W / 2 }}
                />
              )}
            </div>
            {/* バー */}
            {rows.map(({ task, depth }) => {
              const s = task.startDate ? dayIdx(task.startDate) : task.dueDate ? dayIdx(task.dueDate) : null;
              const e = task.dueDate ? dayIdx(task.dueDate) : s;
              return (
                <div key={task.id} className="h-10 border-b border-slate-100 relative">
                  {s !== null && e !== null && (
                    <div
                      className={`absolute top-2.5 h-5 rounded-md cursor-pointer group ${
                        depth === 0 ? "bg-indigo-200" : "bg-indigo-100 border border-indigo-300"
                      }`}
                      style={{ left: s * DAY_W, width: Math.max((e - s + 1) * DAY_W, DAY_W) }}
                      onClick={() => setEditing(task)}
                      title={`${task.title} (${task.startDate ?? "?"} 〜 ${task.dueDate ?? "?"}) ${task.progress}%`}
                    >
                      <div
                        className={`h-full rounded-md ${depth === 0 ? "bg-indigo-500" : "bg-indigo-400"}`}
                        style={{ width: `${task.progress}%` }}
                      />
                      <span className="absolute left-1 top-0 text-[10px] text-white leading-5 font-medium truncate max-w-full pr-1 pointer-events-none mix-blend-luminosity">
                        {task.progress > 0 ? `${task.progress}%` : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(editing || creating) && (
        <TaskModal task={editing} onClose={() => { setEditing(null); setCreating(false); }} />
      )}
    </div>
  );
}
