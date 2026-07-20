import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError, apiErrorResponse } from "@/lib/server/projectAccess";
import { mutateProjectFields } from "@/lib/server/projectDoc";
import { CalendarAuthError, fetchCalendarEvents } from "@/lib/server/googleCalendar";
import { uid } from "@/lib/server/id";
import { CalendarEvent, InboxItem, MeetingSource } from "@/lib/types";

function matchesSource(ev: CalendarEvent, s: MeetingSource): boolean {
  return s.type === "event" ? ev.title === s.eventTitle : !!s.namePattern && ev.title.includes(s.namePattern);
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new ApiError(401, "ログインが必要です");
    if (session.error === "RefreshAccessTokenError" || !session.accessToken) {
      throw new ApiError(401, "Googleカレンダーへの再認可が必要です");
    }

    let events: CalendarEvent[];
    try {
      events = await fetchCalendarEvents(session.accessToken, session.user.email);
    } catch (e) {
      if (e instanceof CalendarAuthError) throw new ApiError(401, e.message);
      throw new ApiError(502, "Googleカレンダーの取得に失敗しました");
    }

    let imported = 0;
    const nowIso = new Date().toISOString();
    const email = session.user.email;
    const project = await mutateProjectFields(params.projectId, email, (doc) => {
      const already = new Set(doc.inbox.map((i) => i.sourceEventId).filter(Boolean));
      const newItems: InboxItem[] = [];
      for (const ev of events) {
        if (!ev.hasNotes || already.has(ev.id)) continue;
        if (!doc.meetingSources.some((s) => matchesSource(ev, s))) continue;
        newItems.push({
          id: uid("i"),
          projectId: params.projectId,
          source: "calendar",
          title: ev.title + " 議事メモ",
          author: "Google カレンダー",
          datetime: ev.datetime,
          content: ev.notes,
          status: "new",
          aiSummary: null,
          proposals: [],
          sourceEventId: ev.id,
        });
        already.add(ev.id);
      }
      imported = newItems.length;
      return {
        inbox: [...doc.inbox, ...newItems],
        meetingSources: doc.meetingSources.map((s) => ({ ...s, lastSyncedAt: nowIso })),
      };
    });

    return NextResponse.json({ imported, project });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
