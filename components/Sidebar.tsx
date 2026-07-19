"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar } from "./ui";

const NAV = [
  { href: "/", label: "ダッシュボード", icon: "🏠" },
  { href: "/board", label: "カンバンボード", icon: "📋" },
  { href: "/wbs", label: "WBS / ガント", icon: "📊" },
  { href: "/inbox", label: "連携インボックス", icon: "📥" },
  { href: "/meetings", label: "会議連携の設定", icon: "📆" },
  { href: "/summary", label: "期間サマリ", icon: "📈" },
  { href: "/members", label: "メンバー", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data, ready, project, projectInbox, currentUser, setCurrentProject, addProject } = useStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");

  const newInboxCount = projectInbox.filter((i) => i.status === "new").length;

  return (
    <aside className="w-60 fixed inset-y-0 left-0 bg-slate-900 text-slate-200 flex flex-col z-40">
      <div className="px-4 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <div>
            <div className="font-bold text-white leading-tight">TaskPilot</div>
            <div className="text-[11px] text-slate-400">AI タスク管理</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-slate-700/60">
        <label className="text-[11px] text-slate-400 px-1">プロジェクト</label>
        {ready && (
          <select
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-white"
            value={project.id}
            onChange={(e) => setCurrentProject(e.target.value)}
            data-testid="project-select"
          >
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {showNewProject ? (
          <form
            className="mt-2 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) {
                addProject(newName.trim(), "");
                setNewName("");
                setShowNewProject(false);
              }
            }}
          >
            <input
              autoFocus
              className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              placeholder="プロジェクト名"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="text-xs bg-indigo-600 hover:bg-indigo-500 rounded px-2">作成</button>
          </form>
        ) : (
          <button
            className="mt-2 w-full text-left text-xs text-slate-400 hover:text-white px-1"
            onClick={() => setShowNewProject(true)}
          >
            ＋ 新規プロジェクト
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {n.href === "/inbox" && newInboxCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {newInboxCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-700/60 flex items-center gap-2.5">
        <Avatar member={currentUser} size={32} />
        <div className="min-w-0">
          <div className="text-sm text-white truncate">{currentUser?.name ?? "ゲスト"}</div>
          <div className="text-[10px] text-slate-400 truncate">{data.currentUserEmail}</div>
        </div>
      </div>
    </aside>
  );
}
