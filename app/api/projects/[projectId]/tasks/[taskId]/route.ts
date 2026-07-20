import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { Task } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  try {
    const session = await requireSession();
    const patch = await req.json();
    const now = new Date().toISOString();
    const project = await mutateProjectArray<Task>(
      params.projectId,
      session.user.email,
      "tasks",
      (tasks) => tasks.map((t) => (t.id === params.taskId ? { ...t, ...patch, updatedAt: now } : t))
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  try {
    const session = await requireSession();
    const project = await mutateProjectArray<Task>(
      params.projectId,
      session.user.email,
      "tasks",
      (tasks) => tasks.filter((t) => t.id !== params.taskId && t.parentId !== params.taskId)
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
