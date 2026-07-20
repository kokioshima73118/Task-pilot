import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { uid } from "@/lib/server/id";
import { MeetingSource } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const source: MeetingSource = {
      id: uid("ms"),
      projectId: params.projectId,
      type: body.type,
      label: body.label,
      eventTitle: body.eventTitle,
      namePattern: body.namePattern,
      autoImport: !!body.autoImport,
      createdAt: new Date().toISOString(),
      lastSyncedAt: null,
    };
    const project = await mutateProjectArray<MeetingSource>(
      params.projectId,
      session.user.email,
      "meetingSources",
      (sources) => [...sources, source]
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
