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
  sourceEventId?: string; // 取り込み元カレンダー会議 (重複取り込み防止)
}

/**
 * ログインユーザーのカレンダー上の会議 (Google Calendar のモック)。
 * 実接続時は Calendar API の events.list を attendee=self でフィルタした結果に相当。
 */
export interface CalendarEvent {
  id: string;
  title: string;
  datetime: string; // "YYYY-MM-DD HH:mm"
  organizer: string; // 主催者メール
  attendees: string[]; // 参加者メール
  recurring: boolean; // 定例会議か
  hasNotes: boolean; // 議事メモ (Gemini メモ等) があるか
  notes: string; // 議事メモ本文
}

/** プロジェクトごとに「どの会議から情報を読み込むか」を定義する設定。 */
export interface MeetingSource {
  id: string;
  projectId: string;
  type: "event" | "recurring";
  label: string; // 表示名
  eventTitle?: string; // type=event: 完全一致する会議タイトル
  namePattern?: string; // type=recurring: 部分一致する名称 (例: "週次定例MTG")
  autoImport: boolean; // 一致する会議を自動で取り込むか
  createdAt: string;
  lastSyncedAt: string | null;
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
  calendarEvents: CalendarEvent[]; // ログインユーザーのカレンダー
  meetingSources: MeetingSource[]; // プロジェクト別の会議読み込み設定
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
