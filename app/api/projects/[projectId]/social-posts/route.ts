import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { uid } from "@/lib/server/id";
import { SocialPost } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const post: SocialPost = {
      id: uid("sp"),
      projectId: params.projectId,
      accountId: body.accountId ?? null,
      platform: body.platform,
      content: body.content,
      scheduledAt: body.scheduledAt,
      status: body.status,
      assigneeId: body.assigneeId ?? null,
      tags: body.tags ?? [],
      likes: Number(body.likes) || 0,
      comments: Number(body.comments) || 0,
      shares: Number(body.shares) || 0,
      impressions: Number(body.impressions) || 0,
    };
    const project = await mutateProjectArray<SocialPost>(
      params.projectId,
      session.user.email,
      "socialPosts",
      (posts) => [...posts, post]
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
