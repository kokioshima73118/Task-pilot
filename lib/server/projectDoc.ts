import { ProjectDoc } from "@/lib/types";
import { ApiError } from "./projectAccess";
import { getDb } from "./firestoreAdmin";

type ArrayField =
  | "tasks"
  | "inbox"
  | "meetingSources"
  | "accounts"
  | "socialAccounts"
  | "socialPosts"
  | "members";

/**
 * projects/{projectId} ドキュメントの指定した配列フィールドをトランザクション内で
 * 読み込み、mutate() で新しい配列に変換して書き戻す。単一ドキュメントへの
 * blind overwrite ではなくトランザクションを使うことで、同時編集による
 * 上書き事故を防ぐ (Firestore はトランザクション競合時に自動リトライする)。
 */
export async function mutateProjectArray<T>(
  projectId: string,
  email: string,
  field: ArrayField,
  mutate: (current: T[]) => T[]
): Promise<ProjectDoc> {
  const db = getDb();
  const ref = db.collection("projects").doc(projectId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "プロジェクトが見つかりません");
    const data = snap.data() as ProjectDoc;
    if (!data.memberEmails?.includes(email)) {
      throw new ApiError(403, "このプロジェクトへのアクセス権がありません");
    }

    const current = ((data as unknown as Record<string, unknown>)[field] as T[]) ?? [];
    const next = mutate(current);
    const patch: Record<string, unknown> = { [field]: next };
    if (field === "members") {
      patch.memberEmails = (next as unknown as { email: string }[]).map((m) => m.email);
    }

    tx.update(ref, patch);
    return { ...data, ...patch, id: snap.id } as ProjectDoc;
  });
}

/**
 * 複数フィールドにまたがる更新 (例: SNSアカウント削除で socialPosts も同時に更新する) を
 * トランザクション内でアトミックに行う。mutate() には現在のドキュメント全体を渡し、
 * 変更したいフィールドだけを含む部分オブジェクトを返してもらう。
 */
export async function mutateProjectFields(
  projectId: string,
  email: string,
  mutate: (doc: ProjectDoc) => Partial<Omit<ProjectDoc, "id">>
): Promise<ProjectDoc> {
  const db = getDb();
  const ref = db.collection("projects").doc(projectId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "プロジェクトが見つかりません");
    const data = { ...(snap.data() as ProjectDoc), id: snap.id };
    if (!data.memberEmails?.includes(email)) {
      throw new ApiError(403, "このプロジェクトへのアクセス権がありません");
    }
    const patch = mutate(data);
    tx.update(ref, patch);
    return { ...data, ...patch };
  });
}
