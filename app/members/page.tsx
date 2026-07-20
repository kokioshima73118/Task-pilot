"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui";
import { MemberRole } from "@/lib/types";

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "オーナー",
  admin: "管理者",
  member: "メンバー",
};

export default function MembersPage() {
  const { ready, project, projectTasks, currentUser, inviteMember, updateMember, removeMember } = useStore();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [invited, setInvited] = useState<string | null>(null);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const canManage = currentUser?.role === "owner" || currentUser?.role === "admin";

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;
    if (project.members.some((m) => m.email === em)) {
      setInvited(`${em} は既にメンバーです`);
      return;
    }
    inviteMember(em, name.trim());
    setInvited(`${em} を招待しました。そのGoogleアカウントでログインすると自動的に参加します。`);
    setEmail("");
    setName("");
  };

  const taskCount = (memberId: string) =>
    projectTasks.filter((t) => t.assigneeId === memberId && t.status !== "done").length;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold mb-1">メンバー</h1>
      <p className="text-sm text-slate-500 mb-6">
        {project.name} — Googleアカウント単位でプロジェクトに招待できます
      </p>

      {canManage && (
        <form onSubmit={invite} className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <h2 className="font-bold text-sm mb-3">✉️ メンバーを招待</h2>
          <div className="flex gap-2">
            <input
              type="email"
              required
              className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="Googleアカウント (例: taro.yamada@gmail.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="invite-email"
            />
            <input
              className="w-40 border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="表示名 (任意)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md px-4 py-2">
              招待
            </button>
          </div>
          {invited && <p className="text-xs text-emerald-600 mt-2">{invited}</p>}
          <p className="text-[11px] text-slate-400 mt-2">
            ※ 招待メールは送信されません。招待したGoogleアカウントが TaskPilot に初めてログインした時点で、
            このプロジェクトへの参加ステータスが自動的に「招待中」→「参加済み」に切り替わります。
          </p>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {project.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar member={m} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium flex items-center gap-2">
                {m.name}
                {m.email === currentUser?.email && (
                  <span className="text-[10px] bg-slate-200 text-slate-600 rounded px-1.5 py-0.5">あなた</span>
                )}
                {m.status === "invited" && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">招待中 (未ログイン)</span>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate">{m.email}</div>
            </div>
            <span className="text-xs text-slate-500">
              担当 {taskCount(m.id)} 件
            </span>
            {canManage && m.role !== "owner" ? (
              <>
                <select
                  className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                  value={m.role}
                  onChange={(e) => updateMember(m.id, { role: e.target.value as MemberRole })}
                >
                  <option value="admin">管理者</option>
                  <option value="member">メンバー</option>
                </select>
                <button
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => removeMember(m.id)}
                >
                  削除
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500 w-16 text-right">{ROLE_LABEL[m.role]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
