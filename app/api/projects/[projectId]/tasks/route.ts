import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { uid } from "@/lib/server/id";
import { Task } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    if (!body.title || !String(body.title).trim()) {
      return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const task: Task = {
      id: uid("t"),
      projectId: params.projectId,
      title: String(body.title).trim(),
      description: body.description ?? "",
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      assigneeId: body.assigneeId ?? null,
      parentId: body.parentId ?? null,
      startDate: body.startDate ?? null,
      dueDate: body.dueDate ?? null,
      progress: body.progress ?? 0,
      tags: body.tags ?? [],
      source: body.source ?? "manual",
      sourceLabel: body.sourceLabel,
      createdAt: now,
      updatedAt: now,
    };
    const project = await mutateProjectArray<Task>(
      params.projectId,
      session.user.email,
      "tasks",
      (tasks) => [...tasks, task]
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
