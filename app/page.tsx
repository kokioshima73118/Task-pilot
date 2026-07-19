"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar, PriorityBadge, SourceBadge, StatusBadge } from "@/components/ui";
import TaskModal from "@/components/TaskModal";
import { Task } from "@/lib/types";

export default function Dashboard() {
  const { ready, project, projectTasks, projectInbox, currentUser } = useStore();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const total = projectTasks.length;
  const done = projectTasks.filter((t) => t.status === "done").length;
  const doing = projectTasks.filter((t) => t.status === "doing").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = projectTasks.filter(
    (t) => t.status !== "done" && t.dueDate && t.dueDate < today
  );
  const myTasks = projectTasks
    .filter((t) => t.assigneeId === currentUser?.id && t.status !== "done")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const upcoming = projectTasks
    .filter((t) => t.status !== "done" && t.dueDate && t.dueDate >= today)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .slice(0, 5);
  const newInbox = projectInbox.filter((i) => i.status === "new");
  const progress = total ? Math.round((done / total) * 100) : 0;

  const findMember = (id: string | null) => project.members.find((m) => m.id === id);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: project.color }} />
            {project.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{project.description}</p>
        </div>
        <button
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md px-4 py-2"
          onClick={() => setCreating(true)}
        >
          ＋ タスク作成
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="全タスク" value={total} sub={`完了 ${done}`} />
        <StatCard label="進行中" value={doing} sub="アクティブ" accent="text-blue-600" />
        <StatCard label="期限超過" value={overdue.length} sub="要対応" accent={overdue.length ? "text-red-600" : undefined} />
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">プロジェクト進捗</div>
          <div className="text-2xl font-bold mt-1">{progress}%</div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {newInbox.length > 0 && (
        <Link
          href="/inbox"
          className="block mb-6 bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-200 rounded-xl p-4 hover:border-indigo-400 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-indigo-900">
                未処理の連携アイテムが {newInbox.length} 件あります
              </div>
              <div className="text-xs text-indigo-700/70 mt-0.5">
                {newInbox.map((i) => i.title).join(" / ")} — AIでタスクを自動抽出できます
              </div>
            </div>
            <span className="text-indigo-500 text-sm font-medium">インボックスへ →</span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-bold text-sm mb-3">マイタスク ({myTasks.length})</h2>
          <div className="space-y-2">
            {myTasks.length === 0 && (
              <p className="text-sm text-slate-400">担当タスクはありません 🎉</p>
            )}
            {myTasks.map((t) => (
              <TaskRow key={t.id} task={t} today={today} onClick={() => setEditing(t)} />
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold text-sm mb-3">期限が近いタスク</h2>
            <div className="space-y-2">
              {upcoming.length === 0 && <p className="text-sm text-slate-400">なし</p>}
              {upcoming.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded-md px-2 py-1.5 -mx-2"
                  onClick={() => setEditing(t)}
                >
                  <Avatar member={findMember(t.assigneeId)} size={22} />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-slate-500 tabular-nums">{t.dueDate}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold text-sm mb-3">期限超過 ⚠️</h2>
            <div className="space-y-2">
              {overdue.length === 0 && <p className="text-sm text-slate-400">超過タスクはありません</p>}
              {overdue.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-red-50 rounded-md px-2 py-1.5 -mx-2"
                  onClick={() => setEditing(t)}
                >
                  <Avatar member={findMember(t.assigneeId)} size={22} />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-red-600 font-medium tabular-nums">{t.dueDate}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {(editing || creating) && (
        <TaskModal task={editing} onClose={() => { setEditing(null); setCreating(false); }} />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ?? ""}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function TaskRow({ task, today, onClick }: { task: Task; today: string; onClick: () => void }) {
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== "done";
  return (
    <div
      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-md px-2 py-1.5 -mx-2"
      onClick={onClick}
    >
      <StatusBadge status={task.status} />
      <span className="flex-1 text-sm truncate">{task.title}</span>
      {task.source !== "manual" && <SourceBadge source={task.source} />}
      <PriorityBadge priority={task.priority} />
      {task.dueDate && (
        <span className={`text-xs tabular-nums ${isOverdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
          {task.dueDate}
        </span>
      )}
    </div>
  );
}
