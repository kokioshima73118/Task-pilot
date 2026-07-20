import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { uid } from "@/lib/server/id";
import { SocialAccount } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const account: SocialAccount = {
      id: uid("s"),
      projectId: params.projectId,
      platform: body.platform,
      handle: body.handle,
      displayName: body.displayName || body.handle,
      followers: Number(body.followers) || 0,
      ownerId: body.ownerId ?? null,
      url: body.url ?? "",
    };
    const project = await mutateProjectArray<SocialAccount>(
      params.projectId,
      session.user.email,
      "socialAccounts",
      (accounts) => [...accounts, account]
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
