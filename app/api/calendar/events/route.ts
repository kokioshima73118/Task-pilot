import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CalendarAuthError, fetchCalendarEvents } from "@/lib/server/googleCalendar";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (session.error === "RefreshAccessTokenError" || !session.accessToken) {
    return NextResponse.json(
      { error: "Googleカレンダーへの再認可が必要です", code: "REAUTH_REQUIRED" },
      { status: 401 }
    );
  }

  try {
    const events = await fetchCalendarEvents(session.accessToken, session.user.email);
    return NextResponse.json(events);
  } catch (e) {
    if (e instanceof CalendarAuthError) {
      return NextResponse.json({ error: e.message, code: "REAUTH_REQUIRED" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Googleカレンダーの取得に失敗しました" }, { status: 502 });
  }
}
