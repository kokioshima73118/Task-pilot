import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireProjectMember, requireSession } from "@/lib/server/projectAccess";

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await requireSession();
    const project = await requireProjectMember(params.projectId, session.user.email);
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
