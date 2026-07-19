"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar, PriorityBadge, SourceBadge } from "@/components/ui";
import TaskModal from "@/components/TaskModal";
import { Task, TaskStatus, STATUS_LABEL } from "@/lib/types";

const COLUMNS: TaskStatus[] = ["todo", "doing", "review", "done"];
const COL_ACCENT: Record<TaskStatus, string> = {
  todo: "border-t-slate-400",
  doing: "border-t-blue-500",
  review: "border-t-purple-500",
  done: "border-t-emerald-500",
};

export default function BoardPage() {
  const { ready, project, projectTasks, updateTask } = useStore();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const findMember = (id: string | null) => project.members.find((m) => m.id === id);

  const drop = (status: TaskStatus) => {
    if (dragId) {
      updateTask(dragId, status === "done" ? { status, progress: 100 } : { status });
    }
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">カンバンボード</h1>
        <span className="text-sm text-slate-500">{project.name}</span>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-1 min-h-0">
        {COLUMNS.map((col) => {
          const tasks = projectTasks.filter((t) => t.status === col);
          return (
            <div
              key={col}
              className={`bg-slate-50 rounded-xl border border-slate-200 border-t-4 ${COL_ACCENT[col]} flex flex-col min-h-0 ${
                overCol === col ? "ring-2 ring-indigo-400 bg-indigo-50/50" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col);
              }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => drop(col)}
              data-testid={`col-${col}`}
            >
              <div className="px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-bold">{STATUS_LABEL[col]}</span>
                <span className="text-xs text-slate-500 bg-slate-200 rounded-full px-2 py-0.5">
                  {tasks.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onClick={() => setEditing(t)}
                    className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all"
                  >
                    <div className="text-sm font-medium leading-snug">{t.title}</div>
                    {t.parentId && (
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        ⌞ {projectTasks.find((p) => p.id === t.parentId)?.title}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <PriorityBadge priority={t.priority} />
                      {t.source !== "manual" && <SourceBadge source={t.source} />}
                      {t.dueDate && (
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          〜{t.dueDate.slice(5).replace("-", "/")}
                        </span>
                      )}
                      <span className="flex-1" />
                      <Avatar member={findMember(t.assigneeId)} size={22} />
                    </div>
                    {t.progress > 0 && t.status !== "done" && (
                      <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400" style={{ width: `${t.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className="w-full text-left text-xs text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md px-2 py-1.5"
                  onClick={() => setCreating(col)}
                >
                  ＋ タスクを追加
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <TaskModal
          task={editing}
          defaults={creating ? ({ status: creating } as Partial<Task>) : undefined}
          onClose={() => {
            setEditing(null);
            setCreating(null);
          }}
        />
      )}
    </div>
  );
}
