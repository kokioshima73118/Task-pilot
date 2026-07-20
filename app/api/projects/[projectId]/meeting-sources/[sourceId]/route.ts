import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { MeetingSource } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; sourceId: string } }
) {
  try {
    const session = await requireSession();
    const patch = await req.json();
    const project = await mutateProjectArray<MeetingSource>(
      params.projectId,
      session.user.email,
      "meetingSources",
      (sources) => sources.map((s) => (s.id === params.sourceId ? { ...s, ...patch } : s))
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; sourceId: string } }
) {
  try {
    const session = await requireSession();
    const project = await mutateProjectArray<MeetingSource>(
      params.projectId,
      session.user.email,
      "meetingSources",
      (sources) => sources.filter((s) => s.id !== params.sourceId)
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
