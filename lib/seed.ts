import { AppData, CalendarEvent, InboxItem, MeetingSource, Member, Project, Task } from "./types";

const today = new Date();
function d(offset: number): string {
  const t = new Date(today);
  t.setDate(t.getDate() + offset);
  return t.toISOString().slice(0, 10);
}

const members: Member[] = [
  { id: "m1", name: "大島 星", email: "star.glc.oshima@gmail.com", avatarColor: "#6366f1", role: "owner", status: "active" },
  { id: "m2", name: "佐藤 健太", email: "kenta.sato@example.com", avatarColor: "#10b981", role: "admin", status: "active" },
  { id: "m3", name: "田中 美咲", email: "misaki.tanaka@example.com", avatarColor: "#f59e0b", role: "member", status: "active" },
  { id: "m4", name: "鈴木 大輔", email: "daisuke.suzuki@example.com", avatarColor: "#ec4899", role: "member", status: "invited" },
];

const projects: Project[] = [
  {
    id: "p1",
    name: "新製品リリース PJ",
    description: "2026年秋の新製品リリースに向けたクロスファンクショナルプロジェクト",
    color: "#6366f1",
    members,
    createdAt: d(-30),
  },
  {
    id: "p2",
    name: "社内DX推進",
    description: "業務プロセスのデジタル化・自動化プロジェクト",
    color: "#10b981",
    members: members.slice(0, 2),
    createdAt: d(-14),
  },
];

const tasks: Task[] = [
  // フェーズ1: 企画
  { id: "t1", projectId: "p1", title: "企画フェーズ", description: "製品コンセプトの策定と市場調査", status: "done", priority: "high", assigneeId: "m1", parentId: null, startDate: d(-30), dueDate: d(-15), progress: 100, tags: ["企画"], source: "manual", createdAt: d(-30), updatedAt: d(-15) },
  { id: "t2", projectId: "p1", title: "市場調査レポート作成", description: "競合3社の分析を含む", status: "done", priority: "medium", assigneeId: "m3", parentId: "t1", startDate: d(-30), dueDate: d(-20), progress: 100, tags: ["調査"], source: "manual", createdAt: d(-30), updatedAt: d(-20) },
  { id: "t3", projectId: "p1", title: "製品コンセプト承認", description: "経営会議での承認取得", status: "done", priority: "high", assigneeId: "m1", parentId: "t1", startDate: d(-18), dueDate: d(-15), progress: 100, tags: ["承認"], source: "manual", createdAt: d(-18), updatedAt: d(-15) },
  // フェーズ2: 開発
  { id: "t4", projectId: "p1", title: "開発フェーズ", description: "MVP開発とテスト", status: "doing", priority: "high", assigneeId: "m2", parentId: null, startDate: d(-14), dueDate: d(21), progress: 45, tags: ["開発"], source: "manual", createdAt: d(-14), updatedAt: d(0) },
  { id: "t5", projectId: "p1", title: "API設計・実装", description: "REST API v1の設計と実装", status: "doing", priority: "high", assigneeId: "m2", parentId: "t4", startDate: d(-14), dueDate: d(3), progress: 70, tags: ["開発", "API"], source: "manual", createdAt: d(-14), updatedAt: d(0) },
  { id: "t6", projectId: "p1", title: "フロントエンド実装", description: "主要3画面のUI実装", status: "doing", priority: "medium", assigneeId: "m3", parentId: "t4", startDate: d(-7), dueDate: d(10), progress: 30, tags: ["開発", "UI"], source: "manual", createdAt: d(-7), updatedAt: d(0) },
  { id: "t7", projectId: "p1", title: "結合テスト", description: "API×フロントの結合テスト", status: "todo", priority: "medium", assigneeId: "m4", parentId: "t4", startDate: d(11), dueDate: d(21), progress: 0, tags: ["テスト"], source: "manual", createdAt: d(-7), updatedAt: d(-7) },
  // フェーズ3: リリース準備
  { id: "t8", projectId: "p1", title: "リリース準備フェーズ", description: "マーケティングとローンチ準備", status: "todo", priority: "medium", assigneeId: "m1", parentId: null, startDate: d(15), dueDate: d(45), progress: 0, tags: ["リリース"], source: "manual", createdAt: d(-7), updatedAt: d(-7) },
  { id: "t9", projectId: "p1", title: "プレスリリース文面作成", description: "", status: "todo", priority: "low", assigneeId: "m3", parentId: "t8", startDate: d(15), dueDate: d(25), progress: 0, tags: ["広報"], source: "manual", createdAt: d(-7), updatedAt: d(-7) },
  { id: "t10", projectId: "p1", title: "LP制作", description: "ランディングページのデザイン・実装", status: "review", priority: "medium", assigneeId: "m3", parentId: "t8", startDate: d(-3), dueDate: d(7), progress: 85, tags: ["広報", "UI"], source: "manual", createdAt: d(-10), updatedAt: d(0) },
  // p2
  { id: "t11", projectId: "p2", title: "経費精算フロー自動化", description: "承認フローのワークフロー化", status: "doing", priority: "high", assigneeId: "m2", parentId: null, startDate: d(-10), dueDate: d(14), progress: 40, tags: ["自動化"], source: "manual", createdAt: d(-10), updatedAt: d(0) },
];

const inbox: InboxItem[] = [
  {
    id: "i1",
    projectId: "p1",
    source: "calendar",
    title: "週次定例MTG 議事メモ",
    author: "Google カレンダー (Gemini メモ)",
    datetime: d(-1) + " 10:00",
    status: "new",
    aiSummary: null,
    proposals: [],
    sourceEventId: "ev-weekly-latest",
    content: `## 週次定例MTG (${d(-1)})
参加者: 大島、佐藤、田中、鈴木

### 決定事項
- リリース日は当初予定通り進める。遅延リスクはAPI実装の残タスクに依存。
- LPのデザインレビューは今週金曜に実施する。

### 議論内容
- 佐藤さんより: API実装は70%完了。認証まわりのエラーハンドリングが未対応のため、今週中に対応が必要。
- 田中さんより: フロントエンドのダッシュボード画面でパフォーマンス問題あり。来週火曜までに調査して報告する。
- 大島さんより: プレスリリースのドラフトを広報部に共有する必要がある。今月末までに対応。
- 鈴木さんの結合テスト環境の準備が未着手。佐藤さんがステージング環境の構築手順書を金曜までに作成する。

### 次回までのアクション
- 認証エラーハンドリング対応(佐藤・今週中)
- ダッシュボードのパフォーマンス調査(田中・来週火曜)
- ステージング構築手順書(佐藤・金曜)`,
  },
  {
    id: "i2",
    projectId: "p1",
    source: "chat",
    title: "#新製品リリースPJ (Google Chat)",
    author: "Google Chat",
    datetime: d(0) + " 09:24",
    status: "new",
    aiSummary: null,
    proposals: [],
    content: `[09:12] 田中 美咲: おはようございます。LPのファーストビュー、デザイン案を2パターン作りました。どちらが良いかレビューお願いします 🙏
[09:15] 大島 星: ありがとう!今日の午後見ます。あと、アクセス解析タグの埋め込みもLP公開前に必要なので、タスク化しておいてもらえますか?
[09:18] 佐藤 健太: APIのレートリミット仕様、ドキュメントにまだ書いてないので今週書きます。あとステージングのDBマイグレーションで問題が出てるので、誰かレビュー入ってほしいです。優先度高めです。
[09:20] 田中 美咲: 解析タグの件、了解です。GA4の設定も合わせてやります。
[09:24] 大島 星: マイグレーションのレビューは鈴木さんにお願いしようと思います。招待承認されたら共有します。`,
  },
  {
    id: "i3",
    projectId: "p1",
    source: "calendar",
    title: "顧客ヒアリングMTG 議事メモ",
    author: "Google カレンダー (Gemini メモ)",
    datetime: d(-3) + " 15:00",
    status: "done",
    sourceEventId: "ev-hearing",
    aiSummary: "既存顧客3社へのヒアリングを実施。CSV一括インポート機能への要望が最多。モバイル対応は次期フェーズで検討することで合意。",
    proposals: [
      { id: "pr1", title: "CSV一括インポート機能の要件定義", description: "顧客ヒアリングで最多要望。優先検討。", assigneeName: "佐藤 健太", dueDate: d(10), priority: "medium", accepted: true },
    ],
    content: `## 顧客ヒアリングMTG (${d(-3)})
A社・B社・C社の担当者にβ版の感想をヒアリング。
- 3社ともCSV一括インポート機能を強く要望
- モバイル対応の要望はあるが優先度は低め → 次期フェーズで検討
- B社からUI上のラベル文言について細かい指摘リストを受領`,
  },
];

const ALL = members.map((m) => m.email);
const [STAR, KENTA, MISAKI] = ALL;

// ログインユーザー (大島) のカレンダー。実接続時は Calendar API の events.list 相当。
const calendarEvents: CalendarEvent[] = [
  {
    id: "ev-weekly-prev",
    title: "週次定例MTG",
    datetime: d(-8) + " 10:00",
    organizer: STAR,
    attendees: ALL,
    recurring: true,
    hasNotes: true,
    notes: `## 週次定例MTG (${d(-8)})
参加者: 大島、佐藤、田中、鈴木

### 決定事項
- 開発フェーズのスケジュールを1週間前倒しすることで合意。
- デザインシステムのv2をLP制作にも適用する。

### 議論内容
- 佐藤さんより: API設計のドラフトが完成。今週レビュー会を実施したい。
- 田中さんより: UIコンポーネントの共通化を進める。来週火曜までにStorybookを整備する。
- 大島さんより: 採用面談の日程調整が必要。人事と連携して今週中に確定させる。

### 次回までのアクション
- APIレビュー会の開催(佐藤・今週中)
- Storybook整備(田中・来週火曜)`,
  },
  {
    id: "ev-weekly-latest",
    title: "週次定例MTG",
    datetime: d(-1) + " 10:00",
    organizer: STAR,
    attendees: ALL,
    recurring: true,
    hasNotes: true,
    notes: `(取り込み済み) 週次定例MTG ${d(-1)} の議事メモ`,
  },
  {
    id: "ev-weekly-next",
    title: "週次定例MTG",
    datetime: d(6) + " 10:00",
    organizer: STAR,
    attendees: ALL,
    recurring: true,
    hasNotes: false, // 未来の予定 (議事メモ未作成)
    notes: "",
  },
  {
    id: "ev-sprint",
    title: "開発スプリントレビュー",
    datetime: d(-7) + " 16:00",
    organizer: KENTA,
    attendees: [STAR, KENTA, MISAKI],
    recurring: true,
    hasNotes: true,
    notes: `## 開発スプリントレビュー (${d(-7)})
参加者: 大島、佐藤、田中

### 完了したもの
- ユーザー認証のバックエンド実装
- ダッシュボードの初期レイアウト

### 次スプリントの計画
- 佐藤: 認証のリフレッシュトークン対応を実装する。今週中。
- 田中: ダッシュボードのグラフ描画を実装。来週火曜まで。
- 大島: QA環境のセットアップ手順をまとめる必要がある。`,
  },
  {
    id: "ev-hearing",
    title: "顧客ヒアリングMTG",
    datetime: d(-3) + " 15:00",
    organizer: STAR,
    attendees: [STAR, KENTA, MISAKI],
    recurring: false,
    hasNotes: true,
    notes: `(取り込み済み) 顧客ヒアリングMTG ${d(-3)} の議事メモ`,
  },
  {
    id: "ev-1on1",
    title: "大島 × 佐藤 1on1",
    datetime: d(-2) + " 11:00",
    organizer: STAR,
    attendees: [STAR, KENTA],
    recurring: true,
    hasNotes: true,
    notes: `## 1on1 (${d(-2)}) 大島 × 佐藤
- 佐藤さんの負荷が高め。結合テストのタスクを鈴木さんへ再配分することを検討。
- API設計ドキュメントのレビュー担当を決める必要がある。
- 次期フェーズの技術選定について来週改めて議論する。`,
  },
  {
    id: "ev-exec",
    title: "経営会議",
    datetime: d(-5) + " 14:00",
    organizer: "ceo@example.com",
    attendees: ["ceo@example.com", KENTA], // 大島は招待されていない → 選択候補に出ない
    recurring: true,
    hasNotes: true,
    notes: "経営会議の議事メモ (機密)",
  },
];

// p1 の会議読み込み設定。週次定例は名称パターンで自動取り込み。
const meetingSources: MeetingSource[] = [
  {
    id: "ms1",
    projectId: "p1",
    type: "recurring",
    label: "週次定例MTG",
    namePattern: "週次定例MTG",
    autoImport: true,
    createdAt: d(-30),
    lastSyncedAt: d(-1) + "T10:30:00.000Z",
  },
  {
    id: "ms2",
    projectId: "p1",
    type: "event",
    label: "顧客ヒアリングMTG",
    eventTitle: "顧客ヒアリングMTG",
    autoImport: false,
    createdAt: d(-4),
    lastSyncedAt: d(-3) + "T15:30:00.000Z",
  },
];

export const seedData: AppData = {
  projects,
  tasks,
  inbox,
  calendarEvents,
  meetingSources,
  currentProjectId: "p1",
  currentUserEmail: "star.glc.oshima@gmail.com",
};
