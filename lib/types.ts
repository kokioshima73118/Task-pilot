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

// ===== アカウント管理 =====
export type AccountCategory =
  | "saas"
  | "cloud"
  | "dev"
  | "design"
  | "marketing"
  | "finance"
  | "other";
export type AccountStatus = "active" | "trial" | "expired" | "unused";

/** プロジェクトで利用する外部サービスのアカウント。 */
export interface ServiceAccount {
  id: string;
  projectId: string;
  service: string; // サービス名 (例: Figma, AWS)
  category: AccountCategory;
  loginId: string; // ログインID / 管理者メール
  plan: string; // プラン名
  ownerId: string | null; // 社内の管理担当 (member)
  monthlyCost: number; // 月額 (円)
  seats: number; // ライセンス数
  status: AccountStatus;
  renewalDate: string | null; // 更新日 YYYY-MM-DD
  url: string;
  notes: string;
  createdAt: string;
}

// ===== SNS管理 =====
export type SnsPlatform = "x" | "instagram" | "facebook" | "linkedin" | "youtube" | "tiktok";
export type PostStatus = "draft" | "scheduled" | "posted";

/** プロジェクトが運用する SNS アカウント。 */
export interface SocialAccount {
  id: string;
  projectId: string;
  platform: SnsPlatform;
  handle: string; // @handle
  displayName: string;
  followers: number;
  ownerId: string | null; // 運用担当 (member)
  url: string;
}

/** SNS 投稿 (下書き / 予約 / 投稿済み)。 */
export interface SocialPost {
  id: string;
  projectId: string;
  accountId: string | null;
  platform: SnsPlatform;
  content: string;
  scheduledAt: string; // "YYYY-MM-DD HH:mm"
  status: PostStatus;
  assigneeId: string | null;
  tags: string[];
  // エンゲージメント (投稿済みのみ)
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}

/** プロジェクトの軽量表現 (一覧表示・所属確認用)。Firestore の projects/{id} ドキュメントのトップレベルフィールドに対応。 */
export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  members: Member[];
  memberEmails: string[]; // Firestore の array-contains クエリ用 (members から導出)
  ownerEmail: string;
  createdAt: string;
}

/**
 * プロジェクト1件分の全データ。Firestore では `projects/{projectId}` ドキュメント1つに
 * これら全フィールドが格納される (シンプル構成: プロジェクトごとに1ドキュメント)。
 */
export interface ProjectDoc extends Project {
  tasks: Task[];
  inbox: InboxItem[];
  meetingSources: MeetingSource[];
  accounts: ServiceAccount[];
  socialAccounts: SocialAccount[];
  socialPosts: SocialPost[];
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

export const CATEGORY_LABEL: Record<AccountCategory, string> = {
  saas: "SaaS / 業務",
  cloud: "クラウド",
  dev: "開発",
  design: "デザイン",
  marketing: "マーケ",
  finance: "会計 / 経理",
  other: "その他",
};

export const CATEGORY_ICON: Record<AccountCategory, string> = {
  saas: "🧩",
  cloud: "☁️",
  dev: "🛠️",
  design: "🎨",
  marketing: "📣",
  finance: "💰",
  other: "📦",
};

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: "利用中",
  trial: "トライアル",
  expired: "期限切れ",
  unused: "未使用",
};

export const PLATFORM_LABEL: Record<SnsPlatform, string> = {
  x: "X (Twitter)",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export const PLATFORM_ICON: Record<SnsPlatform, string> = {
  x: "𝕏",
  instagram: "📸",
  facebook: "📘",
  linkedin: "💼",
  youtube: "▶️",
  tiktok: "🎵",
};

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  posted: "投稿済み",
};
