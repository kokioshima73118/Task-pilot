import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/firestoreAdmin";
import { apiErrorResponse, requireSession } from "@/lib/server/projectAccess";
import { buildNewProjectDoc } from "@/lib/server/newProjectDoc";
import { Project } from "@/lib/types";

export async function GET() {
  try {
    const session = await requireSession();
    const snap = await getDb()
      .collection("projects")
      .where("memberEmails", "array-contains", session.user.email)
      .select("name", "description", "color", "members", "memberEmails", "ownerEmail", "createdAt")
      .get();
    const projects: Project[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
    return NextResponse.json(projects);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "プロジェクト名は必須です" }, { status: 400 });
    const ownerName = session.user.name ?? session.user.email.split("@")[0];
    const doc = buildNewProjectDoc(session.user.email, ownerName, name, String(body.description ?? ""));
    const ref = await getDb().collection("projects").add(doc);
    return NextResponse.json({ id: ref.id, ...doc });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
