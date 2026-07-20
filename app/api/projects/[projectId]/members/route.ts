import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { mutateProjectArray } from "@/lib/server/projectDoc";
import { AVATAR_COLORS } from "@/lib/server/newProjectDoc";
import { uid } from "@/lib/server/id";
import { Member } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const email = String(body.email ?? "").trim();
    if (!email) return NextResponse.json({ error: "メールアドレスは必須です" }, { status: 400 });

    const project = await mutateProjectArray<Member>(
      params.projectId,
      session.user.email,
      "members",
      (members) => {
        if (members.some((m) => m.email === email)) {
          throw new ApiError(400, "既にメンバーです");
        }
        return [
          ...members,
          {
            id: uid("m"),
            name: String(body.name ?? "").trim() || email.split("@")[0],
            email,
            avatarColor: AVATAR_COLORS[members.length % AVATAR_COLORS.length],
            role: "member",
            status: "invited",
          },
        ];
      }
    );
    return NextResponse.json(project);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
