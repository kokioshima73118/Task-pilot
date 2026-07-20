import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray, mutateProjectFields } from "@/lib/server/projectDoc";
import { SocialAccount } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; accountId: string } }
) {
  try {
    const session = await requireSession();
    const patch = await req.json();
    const project = await mutateProjectArray<SocialAccount>(
      params.projectId,
      session.user.email,
      "socialAccounts",
      (accounts) => accounts.map((a) => (a.id === params.accountId ? { ...a, ...patch } : a))
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; accountId: string } }
) {
  try {
    const session = await requireSession();
    // アカウント削除時は紐づく投稿の accountId 参照も外す (2フィールドをアトミックに更新)
    const project = await mutateProjectFields(params.projectId, session.user.email, (doc) => ({
      socialAccounts: doc.socialAccounts.filter((a) => a.id !== params.accountId),
      socialPosts: doc.socialPosts.map((p) =>
        p.accountId === params.accountId ? { ...p, accountId: null } : p
      ),
    }));
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
