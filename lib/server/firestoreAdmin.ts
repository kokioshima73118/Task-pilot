import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Cloud Run では Application Default Credentials (アタッチされたサービスアカウント) を、
// ローカル開発では `gcloud auth application-default login` の資格情報を自動的に使う。
// JSON キーファイルは発行・配布しない。
function getAdminApp() {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIRESTORE_PROJECT_ID,
  });
}

export function getDb() {
  return getFirestore(getAdminApp());
}
