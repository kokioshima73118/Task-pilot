"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Priority, Task, TaskStatus, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/types";
import { SourceBadge } from "./ui";

interface Props {
  task?: Task | null; // null/undefined = 新規作成
  defaults?: Partial<Task>;
  onClose: () => void;
}

export default function TaskModal({ task, defaults, onClose }: Props) {
  const { project, projectTasks, addTask, updateTask, deleteTask } = useStore();
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as Priority,
    assigneeId: "",
    parentId: "",
    startDate: "",
    dueDate: "",
    progress: 0,
  });

  useEffect(() => {
    const src = task ?? defaults;
    if (src) {
      setForm({
        title: src.title ?? "",
        description: src.description ?? "",
        status: src.status ?? "todo",
        priority: src.priority ?? "medium",
        assigneeId: src.assigneeId ?? "",
        parentId: src.parentId ?? "",
        startDate: src.startDate ?? "",
        dueDate: src.dueDate ?? "",
        progress: src.progress ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  // 親候補: トップレベルタスクのみ (2階層WBS)。自分自身は除外
  const parentCandidates = projectTasks.filter((t) => !t.parentId && t.id !== task?.id);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const patch = {
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      parentId: form.parentId || null,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      progress: form.status === "done" ? 100 : Number(form.progress),
    };
    if (task) updateTask(task.id, patch);
    else addTask({ ...patch, source: defaults?.source ?? "manual", sourceLabel: defaults?.sourceLabel });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="task-modal"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={save} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">{task ? "タスクを編集" : "タスクを作成"}</h2>
            {task && task.source !== "manual" && <SourceBadge source={task.source} />}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">タイトル *</label>
            <input
              autoFocus
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="タスク名を入力"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">説明</label>
            <textarea
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm h-20"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">ステータス</label>
              <select
                className="mt-1 w-full border border-slate-300 rounded-md px-2 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">優先度</label>
              <select
                className="mt-1 w-full border border-slate-300 rounded-md px-2 py-2 text-sm"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
              >
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">担当者</label>
              <select
                className="mt-1 w-full border border-slate-300 rounded-md px-2 py-2 text-sm"
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              >
                <option value="">未割当</option>
                {project.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">親タスク (WBS)</label>
              <select
                className="mt-1 w-full border border-slate-300 rounded-md px-2 py-2 text-sm"
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">なし (トップレベル)</option>
                {parentCandidates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">開始日</label>
              <input
                type="date"
                className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">期限</label>
              <input
                type="date"
                className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">
              進捗率: {form.progress}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              className="mt-1 w-full"
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
            />
          </div>

          <div className="flex justify-between pt-2">
            {task ? (
              <button
                type="button"
                className="text-sm text-red-600 hover:bg-red-50 rounded-md px-3 py-2"
                onClick={() => {
                  deleteTask(task.id);
                  onClose();
                }}
              >
                削除
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="text-sm rounded-md px-4 py-2 border border-slate-300 hover:bg-slate-50"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="text-sm rounded-md px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
