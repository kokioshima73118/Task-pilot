import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { ProjectDoc } from "@/lib/types";
import { getDb } from "./firestoreAdmin";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** ログイン中の NextAuth セッションを取得する。未ログインなら 401。 */
export async function requireSession(): Promise<Session & { user: { email: string } }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new ApiError(401, "ログインが必要です");
  return session as Session & { user: { email: string } };
}

/** プロジェクトを取得し、ログインユーザーがメンバーであることを確認する。 */
export async function requireProjectMember(projectId: string, email: string): Promise<ProjectDoc> {
  const snap = await getDb().collection("projects").doc(projectId).get();
  if (!snap.exists) throw new ApiError(404, "プロジェクトが見つかりません");
  const data = snap.data() as ProjectDoc;
  if (!data.memberEmails?.includes(email)) {
    throw new ApiError(403, "このプロジェクトへのアクセス権がありません");
  }
  return { ...data, id: snap.id };
}

export function apiErrorResponse(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
}
