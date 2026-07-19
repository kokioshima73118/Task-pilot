export type TaskStatus = "todo" | "doing" | "review" | "done";
export type Priority = "high" | "medium" | "low";
export type MemberRole = "owner" | "admin" | "member";
export type MemberStatus = "active" | "invited";
export type SourceType = "manual" | "calendar" | "chat";

export interface Member {
  id: string;
  name: string;
  email: string; // Google アカウント
  avatarColor: string;
  role: MemberRole;
  status: MemberStatus;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  parentId: string | null; // WBS 階層
  startDate: string | null; // YYYY-MM-DD
  dueDate: string | null;
  progress: number; // 0-100
  tags: string[];
  source: SourceType;
  sourceLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  assigneeName: string | null;
  dueDate: string | null;
  priority: Priority;
  accepted: boolean | null; // null = 未判断
}

export interface InboxItem {
  id: string;
  projectId: string;
  source: "calendar" | "chat";
  title: string; // MTG名 / チャットスペース名
  author: string;
  datetime: string;
  content: string; // 議事メモ本文 / チャットログ
  status: "new" | "analyzed" | "done";
  aiSummary: string | null;
  proposals: Proposal[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  members: Member[];
  createdAt: string;
}

export interface AppData {
  projects: Project[];
  tasks: Task[];
  inbox: InboxItem[];
  currentProjectId: string;
  currentUserEmail: string;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "未着手",
  doing: "進行中",
  review: "レビュー",
  done: "完了",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};
