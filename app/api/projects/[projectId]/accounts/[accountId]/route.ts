import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { ServiceAccount } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; accountId: string } }
) {
  try {
    const session = await requireSession();
    const patch = await req.json();
    const project = await mutateProjectArray<ServiceAccount>(
      params.projectId,
      session.user.email,
      "accounts",
      (accounts) => accounts.map((a) => (a.id === params.accountId ? { ...a, ...patch } : a))
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; accountId: string } }
) {
  try {
    const session = await requireSession();
    const project = await mutateProjectArray<ServiceAccount>(
      params.projectId,
      session.user.email,
      "accounts",
      (accounts) => accounts.filter((a) => a.id !== params.accountId)
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
