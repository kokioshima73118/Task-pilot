import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { uid } from "@/lib/server/id";
import { ServiceAccount } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const account: ServiceAccount = {
      id: uid("a"),
      projectId: params.projectId,
      service: body.service,
      category: body.category,
      loginId: body.loginId ?? "",
      plan: body.plan ?? "",
      ownerId: body.ownerId ?? null,
      monthlyCost: Number(body.monthlyCost) || 0,
      seats: Number(body.seats) || 0,
      status: body.status,
      renewalDate: body.renewalDate ?? null,
      url: body.url ?? "",
      notes: body.notes ?? "",
      createdAt: new Date().toISOString(),
    };
    const project = await mutateProjectArray<ServiceAccount>(
      params.projectId,
      session.user.email,
      "accounts",
      (accounts) => [...accounts, account]
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
