# 🚀 TaskPilot — AI タスク管理アプリ

Google カレンダーの議事メモ・Google Chat の情報を AI で解析し、タスクを自動で WBS に反映できるタスク管理アプリです。

## 機能

| 画面 | 内容 |
|---|---|
| ダッシュボード | プロジェクト進捗・マイタスク・期限超過・連携アイテム通知 |
| カンバンボード | ドラッグ&ドロップでステータス変更 (未着手/進行中/レビュー/完了) |
| WBS / ガント | 2階層WBSツリー + ガントチャート (進捗バー・今日ライン・折りたたみ) |
| 連携インボックス | 📅カレンダー議事メモ / 💬Google Chat の取り込み → AI要約 → タスク候補の承認 → WBS自動反映 |
| メンバー | Googleアカウント (メールアドレス) 単位のプロジェクト招待・ロール管理 |

## 起動

```bash
npm install
npm run dev
# http://localhost:3000
```

## Gemini API (任意)

`.env.local.example` を `.env.local` にコピーして `GEMINI_API_KEY` を設定すると、
連携インボックスの解析が Gemini (gemini-2.0-flash) で動作します。
未設定でもルールベースの簡易解析で動作します。

## アーキテクチャメモ

- データは LocalStorage (`taskpilot-data-v1`) に永続化。シードデータ入り。
- Google カレンダー / Chat 連携は現状モックデータ (`lib/seed.ts` の `inbox`)。
  実接続する場合は Google OAuth (Calendar API `conferenceRecords` / Chat API `spaces.messages`) で
  取得したデータを `InboxItem` 形式に変換して投入する設計。
- AI 解析はサーバー側 API Route (`app/api/ai/route.ts`) 経由。キーはクライアントに露出しない。

## Cloud Run へのデプロイ

GCP プロジェクト `taskpilot-app-72533` (リージョン: `asia-northeast1`) にデプロイ済み。

```bash
gcloud run deploy taskpilot \
  --source . \
  --project=taskpilot-app-72533 \
  --region=asia-northeast1 \
  --allow-unauthenticated \
  --port=8080
```

- `Dockerfile` はマルチステージビルドで `next.config.mjs` の `output: "standalone"` を利用し、
  実行イメージを最小化している。
- Gemini API を使う場合はデプロイ後に環境変数を設定する:
  `gcloud run services update taskpilot --region=asia-northeast1 --set-env-vars GEMINI_API_KEY=xxxx`
- サービス URL: https://taskpilot-730159730676.asia-northeast1.run.app
  (認証なしで公開 — LocalStorage 保存のためユーザーごとにデータは分離される)
