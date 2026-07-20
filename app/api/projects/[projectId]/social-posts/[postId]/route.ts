import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { SocialPost } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; postId: string } }
) {
  try {
    const session = await requireSession();
    const patch = await req.json();
    const project = await mutateProjectArray<SocialPost>(
      params.projectId,
      session.user.email,
      "socialPosts",
      (posts) => posts.map((p) => (p.id === params.postId ? { ...p, ...patch } : p))
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; postId: string } }
) {
  try {
    const session = await requireSession();
    const project = await mutateProjectArray<SocialPost>(
      params.projectId,
      session.user.email,
      "socialPosts",
      (posts) => posts.filter((p) => p.id !== params.postId)
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
