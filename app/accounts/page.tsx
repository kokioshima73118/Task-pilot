"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui";
import {
  AccountCategory,
  AccountStatus,
  ACCOUNT_STATUS_LABEL,
  CATEGORY_ICON,
  CATEGORY_LABEL,
  ServiceAccount,
} from "@/lib/types";

const STATUS_STYLE: Record<AccountStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  unused: "bg-slate-200 text-slate-500",
};

const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");

export default function AccountsPage() {
  const { ready, project, projectAccounts } = useStore();
  const [editing, setEditing] = useState<ServiceAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<AccountCategory | "all">("all");

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const soonStr = soon.toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const monthly = projectAccounts.reduce((s, a) => s + (a.status === "unused" ? 0 : a.monthlyCost), 0);
    const renewingSoon = projectAccounts.filter(
      (a) => a.renewalDate && a.renewalDate >= today && a.renewalDate <= soonStr
    ).length;
    const attention = projectAccounts.filter(
      (a) => a.status === "expired" || a.status === "trial" || (a.renewalDate && a.renewalDate < today)
    ).length;
    return { count: projectAccounts.length, monthly, renewingSoon, attention };
  }, [projectAccounts, today, soonStr]);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const findMember = (id: string | null) => project.members.find((m) => m.id === id);
  const shown = filter === "all" ? projectAccounts : projectAccounts.filter((a) => a.category === filter);
  const categories = Array.from(new Set(projectAccounts.map((a) => a.category)));

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">アカウント管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            {project.name} — プロジェクトで利用する外部サービスの契約・ライセンス・コストを一元管理します。
          </p>
        </div>
        <button
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md px-4 py-2"
          onClick={() => setCreating(true)}
        >
          ＋ アカウント登録
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="登録サービス" value={`${stats.count}`} sub="件" />
        <Stat label="月額コスト合計" value={yen(stats.monthly)} sub="利用中のみ" accent="text-indigo-600" />
        <Stat label="14日以内に更新" value={`${stats.renewingSoon}`} sub="件" accent={stats.renewingSoon ? "text-amber-600" : undefined} />
        <Stat label="要対応" value={`${stats.attention}`} sub="期限切れ / トライアル" accent={stats.attention ? "text-red-600" : undefined} />
      </div>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>すべて</FilterChip>
        {categories.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}
          </FilterChip>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2.5 font-medium">サービス</th>
                <th className="px-3 py-2.5 font-medium">ログインID</th>
                <th className="px-3 py-2.5 font-medium">プラン</th>
                <th className="px-3 py-2.5 font-medium">管理者</th>
                <th className="px-3 py-2.5 font-medium text-right">月額</th>
                <th className="px-3 py-2.5 font-medium text-center">席</th>
                <th className="px-3 py-2.5 font-medium">状態</th>
                <th className="px-3 py-2.5 font-medium">更新日</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => {
                const overdue = a.renewalDate && a.renewalDate < today && a.status !== "unused";
                return (
                  <tr
                    key={a.id}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setEditing(a)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{CATEGORY_ICON[a.category]}</span>
                        <div>
                          <div className="font-medium">{a.service}</div>
                          <div className="text-[11px] text-slate-400">{CATEGORY_LABEL[a.category]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[180px] truncate">{a.loginId}</td>
                    <td className="px-3 py-2.5 text-slate-600">{a.plan}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Avatar member={findMember(a.ownerId)} size={20} />
                        <span className="text-slate-600 text-xs">{findMember(a.ownerId)?.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{a.monthlyCost ? yen(a.monthlyCost) : "—"}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600 tabular-nums">{a.seats || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[a.status]}`}>
                        {ACCOUNT_STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 tabular-nums text-xs ${overdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
                      {a.renewalDate ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    アカウントが登録されていません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(editing || creating) && (
        <AccountModal account={editing} onClose={() => { setEditing(null); setCreating(false); }} />
      )}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${accent ?? ""}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs rounded-full px-3 py-1 border ${
        active ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function AccountModal({ account, onClose }: { account: ServiceAccount | null; onClose: () => void }) {
  const { project, addAccount, updateAccount, deleteAccount } = useStore();
  const [f, setF] = useState({
    service: account?.service ?? "",
    category: account?.category ?? ("saas" as AccountCategory),
    loginId: account?.loginId ?? "",
    plan: account?.plan ?? "",
    ownerId: account?.ownerId ?? "",
    monthlyCost: account?.monthlyCost ?? 0,
    seats: account?.seats ?? 1,
    status: account?.status ?? ("active" as AccountStatus),
    renewalDate: account?.renewalDate ?? "",
    url: account?.url ?? "",
    notes: account?.notes ?? "",
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.service.trim()) return;
    const patch = {
      service: f.service.trim(),
      category: f.category,
      loginId: f.loginId,
      plan: f.plan,
      ownerId: f.ownerId || null,
      monthlyCost: Number(f.monthlyCost) || 0,
      seats: Number(f.seats) || 0,
      status: f.status,
      renewalDate: f.renewalDate || null,
      url: f.url,
      notes: f.notes,
    };
    if (account) updateAccount(account.id, patch);
    else addAccount(patch);
    onClose();
  };

  const input = "mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm";
  const lbl = "text-xs font-medium text-slate-500";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={save} className="p-5 space-y-4">
          <h2 className="font-bold text-lg">{account ? "アカウントを編集" : "アカウントを登録"}</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>サービス名 *</label>
              <input autoFocus className={input} value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} placeholder="例: Figma、AWS" />
            </div>
            <div>
              <label className={lbl}>カテゴリ</label>
              <select className={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as AccountCategory })}>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>状態</label>
              <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AccountStatus })}>
                {Object.entries(ACCOUNT_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={lbl}>ログインID / 管理者メール</label>
              <input className={input} value={f.loginId} onChange={(e) => setF({ ...f, loginId: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>プラン</label>
              <input className={input} value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>管理者</label>
              <select className={input} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}>
                <option value="">未割当</option>
                {project.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>月額 (円)</label>
              <input type="number" min={0} className={input} value={f.monthlyCost} onChange={(e) => setF({ ...f, monthlyCost: Number(e.target.value) })} />
            </div>
            <div>
              <label className={lbl}>ライセンス数</label>
              <input type="number" min={0} className={input} value={f.seats} onChange={(e) => setF({ ...f, seats: Number(e.target.value) })} />
            </div>
            <div>
              <label className={lbl}>更新日</label>
              <input type="date" className={input} value={f.renewalDate} onChange={(e) => setF({ ...f, renewalDate: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>URL</label>
              <input className={input} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>メモ</label>
              <textarea className={`${input} h-16`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-between pt-1">
            {account ? (
              <button type="button" className="text-sm text-red-600 hover:bg-red-50 rounded-md px-3 py-2" onClick={() => { deleteAccount(account.id); onClose(); }}>
                削除
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" className="text-sm rounded-md px-4 py-2 border border-slate-300 hover:bg-slate-50" onClick={onClose}>キャンセル</button>
              <button type="submit" className="text-sm rounded-md px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 font-medium">保存</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
