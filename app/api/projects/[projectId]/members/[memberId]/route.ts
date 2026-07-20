import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { Member } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  try {
    const session = await requireSession();
    const patch = await req.json();
    const project = await mutateProjectArray<Member>(
      params.projectId,
      session.user.email,
      "members",
      (members) => members.map((m) => (m.id === params.memberId ? { ...m, ...patch } : m))
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  try {
    const session = await requireSession();
    const project = await mutateProjectArray<Member>(
      params.projectId,
      session.user.email,
      "members",
      (members) => members.filter((m) => m.id !== params.memberId)
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
