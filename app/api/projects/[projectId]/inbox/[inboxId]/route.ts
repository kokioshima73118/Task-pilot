import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { InboxItem } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; inboxId: string } }
) {
  try {
    const session = await requireSession();
    const patch = await req.json();
    const project = await mutateProjectArray<InboxItem>(
      params.projectId,
      session.user.email,
      "inbox",
      (inbox) => inbox.map((i) => (i.id === params.inboxId ? { ...i, ...patch } : i))
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
