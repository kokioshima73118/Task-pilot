"use client";

import { Member, Priority, TaskStatus, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/types";

export function Avatar({ member, size = 28 }: { member: Member | null | undefined; size?: number }) {
  if (!member) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-400 font-medium shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        title="未割当"
      >
        ?
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-medium shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: member.avatarColor }}
      title={`${member.name} (${member.email})`}
    >
      {member.name.slice(0, 1)}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-200 text-slate-600",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${PRIORITY_STYLE[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export const STATUS_STYLE: Record<TaskStatus, { dot: string; badge: string }> = {
  todo: { dot: "bg-slate-400", badge: "bg-slate-200 text-slate-600" },
  doing: { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
  review: { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  done: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[status].badge}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  if (source === "calendar")
    return <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-100 text-indigo-700">📅 カレンダー</span>;
  if (source === "chat")
    return <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-teal-100 text-teal-700">💬 Chat</span>;
  return null;
}
