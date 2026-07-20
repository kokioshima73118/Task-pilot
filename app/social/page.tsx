"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui";
import {
  PLATFORM_ICON,
  PLATFORM_LABEL,
  POST_STATUS_LABEL,
  PostStatus,
  SnsPlatform,
  SocialPost,
} from "@/lib/types";

const PLATFORMS: SnsPlatform[] = ["x", "instagram", "facebook", "linkedin", "youtube", "tiktok"];

const POST_STATUS_STYLE: Record<PostStatus, string> = {
  draft: "bg-slate-200 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  posted: "bg-emerald-100 text-emerald-700",
};

const compact = (n: number) =>
  n >= 10000 ? (n / 10000).toFixed(1) + "万" : n.toLocaleString("ja-JP");

export default function SocialPage() {
  const { ready, project, projectSocialAccounts, projectSocialPosts, deleteSocialAccount } = useStore();
  const [editing, setEditing] = useState<SocialPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [accModal, setAccModal] = useState(false);
  const [tab, setTab] = useState<PostStatus | "all">("all");

  const monthPrefix = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const followers = projectSocialAccounts.reduce((s, a) => s + a.followers, 0);
    const scheduled = projectSocialPosts.filter((p) => p.status === "scheduled").length;
    const postedThisMonth = projectSocialPosts.filter(
      (p) => p.status === "posted" && p.scheduledAt.startsWith(monthPrefix)
    );
    const engRates = postedThisMonth
      .filter((p) => p.impressions > 0)
      .map((p) => ((p.likes + p.comments + p.shares) / p.impressions) * 100);
    const avgEng = engRates.length ? engRates.reduce((s, r) => s + r, 0) / engRates.length : 0;
    return { followers, scheduled, postedThisMonth: postedThisMonth.length, avgEng };
  }, [projectSocialAccounts, projectSocialPosts, monthPrefix]);

  if (!ready) return <div className="p-8 text-slate-400">読み込み中…</div>;

  const findMember = (id: string | null) => project.members.find((m) => m.id === id);
  const findAccount = (id: string | null) => projectSocialAccounts.find((a) => a.id === id);

  const posts = [...projectSocialPosts]
    .filter((p) => tab === "all" || p.status === tab)
    .sort((a, b) => {
      // 予約/下書きは日付昇順、投稿済みは新しい順
      if (a.status === "posted" && b.status === "posted") return b.scheduledAt.localeCompare(a.scheduledAt);
      return a.scheduledAt.localeCompare(b.scheduledAt);
    });

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">SNS管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            {project.name} — 運用中の SNS アカウントと投稿(下書き・予約・投稿済み)を管理します。
          </p>
        </div>
        <button
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md px-4 py-2"
          onClick={() => setCreating(true)}
        >
          ＋ 投稿を作成
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="総フォロワー" value={compact(stats.followers)} sub={`${projectSocialAccounts.length} アカウント`} accent="text-indigo-600" />
        <Stat label="予約投稿" value={`${stats.scheduled}`} sub="件" accent="text-blue-600" />
        <Stat label="今月の投稿" value={`${stats.postedThisMonth}`} sub="投稿済み" />
        <Stat label="平均エンゲージ率" value={`${stats.avgEng.toFixed(1)}%`} sub="今月投稿分" accent="text-emerald-600" />
      </div>

      {/* SNSアカウント */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-sm">運用アカウント</h2>
        <button className="text-xs text-indigo-600 hover:underline" onClick={() => setAccModal(true)}>
          ＋ アカウント追加
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {projectSocialAccounts.map((a) => (
          <div key={a.id} className="group bg-white rounded-xl border border-slate-200 p-3 relative">
            <button
              className="absolute top-2 right-2 text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
              onClick={() => { if (confirm(`${a.handle} を削除しますか?`)) deleteSocialAccount(a.id); }}
              title="削除"
            >
              ✕
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{PLATFORM_ICON[a.platform]}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{a.displayName}</div>
                <div className="text-[11px] text-slate-400 truncate">{a.handle}</div>
              </div>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <div className="text-lg font-bold tabular-nums">{compact(a.followers)}</div>
                <div className="text-[10px] text-slate-400">フォロワー</div>
              </div>
              <Avatar member={findMember(a.ownerId)} size={22} />
            </div>
          </div>
        ))}
        {projectSocialAccounts.length === 0 && (
          <div className="col-span-4 text-sm text-slate-400 py-4">運用アカウントがありません</div>
        )}
      </div>

      {/* 投稿一覧 */}
      <div className="flex items-center gap-1.5 mb-3">
        {(["all", "draft", "scheduled", "posted"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs rounded-full px-3 py-1 border ${
              tab === t ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t === "all" ? "すべて" : POST_STATUS_LABEL[t]}
            <span className="ml-1 opacity-70">
              {t === "all" ? projectSocialPosts.length : projectSocialPosts.filter((p) => p.status === t).length}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {posts.map((p) => {
          const acc = findAccount(p.accountId);
          const engRate = p.impressions ? ((p.likes + p.comments + p.shares) / p.impressions) * 100 : 0;
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 cursor-pointer hover:border-indigo-300"
              onClick={() => setEditing(p)}
            >
              <span className="text-2xl shrink-0" title={PLATFORM_LABEL[p.platform]}>{PLATFORM_ICON[p.platform]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${POST_STATUS_STYLE[p.status]}`}>
                    {POST_STATUS_LABEL[p.status]}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {p.status === "posted" ? "📤 " : "🕐 "}{p.scheduledAt}
                  </span>
                  {acc && <span className="text-xs text-slate-400">{acc.handle}</span>}
                  {p.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">#{t}</span>
                  ))}
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{p.content}</p>
                {p.status === "posted" && (
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 tabular-nums">
                    <span>❤️ {compact(p.likes)}</span>
                    <span>💬 {compact(p.comments)}</span>
                    <span>🔁 {compact(p.shares)}</span>
                    <span>👁 {compact(p.impressions)}</span>
                    <span className="text-emerald-600 font-medium">エンゲージ率 {engRate.toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className="shrink-0 self-start">
                <Avatar member={findMember(p.assigneeId)} size={24} />
              </div>
            </div>
          );
        })}
        {posts.length === 0 && (
          <div className="text-center text-slate-400 py-10 bg-white rounded-xl border border-slate-200">
            投稿がありません
          </div>
        )}
      </div>

      {(editing || creating) && <PostModal post={editing} onClose={() => { setEditing(null); setCreating(false); }} />}
      {accModal && <AccountModal onClose={() => setAccModal(false)} />}
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

function PostModal({ post, onClose }: { post: SocialPost | null; onClose: () => void }) {
  const { project, projectSocialAccounts, addSocialPost, updateSocialPost, deleteSocialPost } = useStore();
  const [f, setF] = useState({
    accountId: post?.accountId ?? (projectSocialAccounts[0]?.id ?? ""),
    platform: post?.platform ?? (projectSocialAccounts[0]?.platform ?? ("x" as SnsPlatform)),
    content: post?.content ?? "",
    scheduledAt: post?.scheduledAt ?? new Date().toISOString().slice(0, 16).replace("T", " "),
    status: post?.status ?? ("draft" as PostStatus),
    assigneeId: post?.assigneeId ?? "",
    tags: post?.tags.join(", ") ?? "",
    likes: post?.likes ?? 0,
    comments: post?.comments ?? 0,
    shares: post?.shares ?? 0,
    impressions: post?.impressions ?? 0,
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.content.trim()) return;
    // アカウントが選ばれていればそのプラットフォームを採用
    const acc = projectSocialAccounts.find((a) => a.id === f.accountId);
    const patch = {
      accountId: f.accountId || null,
      platform: acc?.platform ?? f.platform,
      content: f.content.trim(),
      scheduledAt: f.scheduledAt,
      status: f.status,
      assigneeId: f.assigneeId || null,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      likes: Number(f.likes) || 0,
      comments: Number(f.comments) || 0,
      shares: Number(f.shares) || 0,
      impressions: Number(f.impressions) || 0,
    };
    if (post) updateSocialPost(post.id, patch);
    else addSocialPost(patch);
    onClose();
  };

  const input = "mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm";
  const lbl = "text-xs font-medium text-slate-500";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={save} className="p-5 space-y-4">
          <h2 className="font-bold text-lg">{post ? "投稿を編集" : "投稿を作成"}</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>アカウント</label>
              <select className={input} value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>
                {projectSocialAccounts.length === 0 && <option value="">(アカウント未登録)</option>}
                {projectSocialAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{PLATFORM_LABEL[a.platform]} {a.handle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>ステータス</label>
              <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as PostStatus })}>
                {Object.entries(POST_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>本文 *</label>
            <textarea autoFocus className={`${input} h-24`} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} maxLength={500} />
            <div className="text-[11px] text-slate-400 text-right mt-0.5">{f.content.length} / 500</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{f.status === "posted" ? "投稿日時" : "予定日時"}</label>
              <input className={input} value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} placeholder="YYYY-MM-DD HH:mm" />
            </div>
            <div>
              <label className={lbl}>担当者</label>
              <select className={input} value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
                <option value="">未割当</option>
                {project.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={lbl}>タグ (カンマ区切り)</label>
              <input className={input} value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="例: キャンペーン, 告知" />
            </div>
          </div>

          {f.status === "posted" && (
            <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
              <div>
                <label className={lbl}>いいね</label>
                <input type="number" min={0} className={input} value={f.likes} onChange={(e) => setF({ ...f, likes: Number(e.target.value) })} />
              </div>
              <div>
                <label className={lbl}>コメント</label>
                <input type="number" min={0} className={input} value={f.comments} onChange={(e) => setF({ ...f, comments: Number(e.target.value) })} />
              </div>
              <div>
                <label className={lbl}>シェア</label>
                <input type="number" min={0} className={input} value={f.shares} onChange={(e) => setF({ ...f, shares: Number(e.target.value) })} />
              </div>
              <div>
                <label className={lbl}>表示回数</label>
                <input type="number" min={0} className={input} value={f.impressions} onChange={(e) => setF({ ...f, impressions: Number(e.target.value) })} />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-1">
            {post ? (
              <button type="button" className="text-sm text-red-600 hover:bg-red-50 rounded-md px-3 py-2" onClick={() => { deleteSocialPost(post.id); onClose(); }}>
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

function AccountModal({ onClose }: { onClose: () => void }) {
  const { project, addSocialAccount } = useStore();
  const [f, setF] = useState({
    platform: "x" as SnsPlatform,
    handle: "",
    displayName: "",
    followers: 0,
    ownerId: "",
    url: "",
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.handle.trim()) return;
    addSocialAccount({
      platform: f.platform,
      handle: f.handle.trim(),
      displayName: f.displayName.trim() || f.handle.trim(),
      followers: Number(f.followers) || 0,
      ownerId: f.ownerId || null,
      url: f.url,
    });
    onClose();
  };

  const input = "mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm";
  const lbl = "text-xs font-medium text-slate-500";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={save} className="p-5 space-y-4">
          <h2 className="font-bold text-lg">SNSアカウントを追加</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>プラットフォーム</label>
              <select className={input} value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value as SnsPlatform })}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>フォロワー数</label>
              <input type="number" min={0} className={input} value={f.followers} onChange={(e) => setF({ ...f, followers: Number(e.target.value) })} />
            </div>
            <div>
              <label className={lbl}>ハンドル *</label>
              <input autoFocus className={input} value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })} placeholder="@account" />
            </div>
            <div>
              <label className={lbl}>表示名</label>
              <input className={input} value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>運用担当</label>
              <select className={input} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}>
                <option value="">未割当</option>
                {project.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>URL</label>
              <input className={input} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="text-sm rounded-md px-4 py-2 border border-slate-300 hover:bg-slate-50" onClick={onClose}>キャンセル</button>
            <button type="submit" className="text-sm rounded-md px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 font-medium">追加</button>
          </div>
        </form>
      </div>
    </div>
  );
}
