import { CalendarEvent } from "@/lib/types";

interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  organizer?: { email?: string };
  attendees?: { email: string }[];
  recurringEventId?: string;
}

export class CalendarAuthError extends Error {}

function toLocalDatetime(start?: { dateTime?: string; date?: string }): string {
  // Google はイベントカレンダーのタイムゾーンのオフセット付きで dateTime を返すため、
  // タイムゾーン変換をせずそのまま先頭16文字 (壁時計時刻) を使う。
  if (start?.dateTime) return start.dateTime.slice(0, 16).replace("T", " ");
  if (start?.date) return start.date + " 00:00";
  return "";
}

/**
 * ログインユーザーの Google カレンダー予定を取得する (過去60日〜先30日)。
 * 議事メモは Gemini などが書き込んだ description フィールドをそのまま利用する
 * (添付ドキュメントの中身までは取得しない — Docs/Drive API と追加スコープが必要になるため)。
 */
export async function fetchCalendarEvents(
  accessToken: string,
  selfEmail: string
): Promise<CalendarEvent[]> {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 60);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 30);

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) throw new CalendarAuthError("Googleカレンダーへの再認可が必要です");
  if (!res.ok) {
    console.error("Calendar API error", res.status, await res.text());
    throw new Error("Googleカレンダーの取得に失敗しました");
  }
  const json = await res.json();
  const items: GCalEvent[] = json.items ?? [];

  return items
    .filter((ev) => ev.summary)
    .map((ev) => {
      const attendees = (ev.attendees ?? []).map((a) => a.email);
      if (!attendees.includes(selfEmail)) attendees.push(selfEmail);
      return {
        id: ev.id,
        title: ev.summary ?? "(無題の予定)",
        datetime: toLocalDatetime(ev.start),
        organizer: ev.organizer?.email ?? "",
        attendees,
        recurring: !!ev.recurringEventId,
        hasNotes: !!ev.description && ev.description.trim().length > 0,
        notes: ev.description ?? "",
      };
    })
    .sort((a, b) => b.datetime.localeCompare(a.datetime));
}
