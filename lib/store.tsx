"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppData, CalendarEvent, InboxItem, MeetingSource, Member, Project, Task } from "./types";
import { seedData } from "./seed";

const STORAGE_KEY = "taskpilot-data-v2";

interface StoreCtx {
  data: AppData;
  ready: boolean;
  project: Project; // 現在のプロジェクト
  projectTasks: Task[];
  projectInbox: InboxItem[];
  projectMeetingSources: MeetingSource[];
  invitedEvents: CalendarEvent[]; // ログインユーザーが招待されている会議
  currentUser: Member | null;
  setCurrentProject: (id: string) => void;
  addTask: (t: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateInbox: (id: string, patch: Partial<InboxItem>) => void;
  addProject: (name: string, description: string) => void;
  inviteMember: (email: string, name: string) => void;
  updateMember: (memberId: string, patch: Partial<Member>) => void;
  removeMember: (memberId: string) => void;
  addMeetingSource: (src: Omit<MeetingSource, "id" | "projectId" | "createdAt" | "lastSyncedAt">) => void;
  updateMeetingSource: (id: string, patch: Partial<MeetingSource>) => void;
  removeMeetingSource: (id: string) => void;
  syncMeetings: () => number; // 取り込んだ件数を返す
  resetData: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

function uid(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 9);
}

const AVATAR_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#ef4444"];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // 旧バージョンのデータには会議関連フィールドが無いため seed で補完する
        setData({
          ...seedData,
          ...parsed,
          calendarEvents: parsed.calendarEvents ?? seedData.calendarEvents,
          meetingSources: parsed.meetingSources ?? seedData.meetingSources,
        });
      }
    } catch {
      /* 破損時は seed のまま */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const project =
    data.projects.find((p) => p.id === data.currentProjectId) ?? data.projects[0];
  const projectTasks = data.tasks.filter((t) => t.projectId === project.id);
  const projectInbox = data.inbox.filter((i) => i.projectId === project.id);
  const projectMeetingSources = data.meetingSources.filter(
    (s) => s.projectId === project.id
  );
  const invitedEvents = [...data.calendarEvents]
    .filter((e) => e.attendees.includes(data.currentUserEmail))
    .sort((a, b) => b.datetime.localeCompare(a.datetime));
  const currentUser =
    project.members.find((m) => m.email === data.currentUserEmail) ?? null;

  const setCurrentProject = useCallback((id: string) => {
    setData((d) => ({ ...d, currentProjectId: id }));
  }, []);

  const addTask = useCallback(
    (t: Partial<Task> & { title: string }): Task => {
      const now = new Date().toISOString();
      const task: Task = {
        id: uid("t"),
        projectId: t.projectId ?? project.id,
        title: t.title,
        description: t.description ?? "",
        status: t.status ?? "todo",
        priority: t.priority ?? "medium",
        assigneeId: t.assigneeId ?? null,
        parentId: t.parentId ?? null,
        startDate: t.startDate ?? null,
        dueDate: t.dueDate ?? null,
        progress: t.progress ?? 0,
        tags: t.tags ?? [],
        source: t.source ?? "manual",
        sourceLabel: t.sourceLabel,
        createdAt: now,
        updatedAt: now,
      };
      setData((d) => ({ ...d, tasks: [...d.tasks, task] }));
      return task;
    },
    [project.id]
  );

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
      ),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.filter((t) => t.id !== id && t.parentId !== id),
    }));
  }, []);

  const updateInbox = useCallback((id: string, patch: Partial<InboxItem>) => {
    setData((d) => ({
      ...d,
      inbox: d.inbox.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const addProject = useCallback((name: string, description: string) => {
    setData((d) => {
      const me = project.members.find((m) => m.email === d.currentUserEmail);
      const p: Project = {
        id: uid("p"),
        name,
        description,
        color: AVATAR_COLORS[d.projects.length % AVATAR_COLORS.length],
        members: me ? [{ ...me, role: "owner" }] : [],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      return { ...d, projects: [...d.projects, p], currentProjectId: p.id };
    });
  }, [project.members]);

  const inviteMember = useCallback(
    (email: string, name: string) => {
      setData((d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id === d.currentProjectId
            ? {
                ...p,
                members: [
                  ...p.members,
                  {
                    id: uid("m"),
                    name: name || email.split("@")[0],
                    email,
                    avatarColor:
                      AVATAR_COLORS[p.members.length % AVATAR_COLORS.length],
                    role: "member",
                    status: "invited",
                  },
                ],
              }
            : p
        ),
      }));
    },
    []
  );

  const updateMember = useCallback((memberId: string, patch: Partial<Member>) => {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === d.currentProjectId
          ? {
              ...p,
              members: p.members.map((m) =>
                m.id === memberId ? { ...m, ...patch } : m
              ),
            }
          : p
      ),
    }));
  }, []);

  const removeMember = useCallback((memberId: string) => {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === d.currentProjectId
          ? { ...p, members: p.members.filter((m) => m.id !== memberId) }
          : p
      ),
    }));
  }, []);

  const addMeetingSource = useCallback(
    (src: Omit<MeetingSource, "id" | "projectId" | "createdAt" | "lastSyncedAt">) => {
      setData((d) => ({
        ...d,
        meetingSources: [
          ...d.meetingSources,
          {
            ...src,
            id: uid("ms"),
            projectId: d.currentProjectId,
            createdAt: new Date().toISOString(),
            lastSyncedAt: null,
          },
        ],
      }));
    },
    []
  );

  const updateMeetingSource = useCallback((id: string, patch: Partial<MeetingSource>) => {
    setData((d) => ({
      ...d,
      meetingSources: d.meetingSources.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const removeMeetingSource = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      meetingSources: d.meetingSources.filter((s) => s.id !== id),
    }));
  }, []);

  const matchesSource = (ev: CalendarEvent, s: MeetingSource) =>
    s.type === "event"
      ? ev.title === s.eventTitle
      : !!s.namePattern && ev.title.includes(s.namePattern);

  // 設定した会議ソースに一致する未取り込みの議事メモをインボックスへ取り込む
  const syncMeetings = useCallback((): number => {
    const sources = data.meetingSources.filter((s) => s.projectId === data.currentProjectId);
    const alreadyImported = new Set(
      data.inbox
        .filter((i) => i.projectId === data.currentProjectId && i.sourceEventId)
        .map((i) => i.sourceEventId)
    );
    const newItems: InboxItem[] = [];
    for (const ev of data.calendarEvents) {
      if (!ev.hasNotes || alreadyImported.has(ev.id)) continue;
      if (!sources.some((s) => matchesSource(ev, s))) continue;
      newItems.push({
        id: uid("i"),
        projectId: data.currentProjectId,
        source: "calendar",
        title: ev.title + " 議事メモ",
        author: "Google カレンダー (Gemini メモ)",
        datetime: ev.datetime,
        content: ev.notes,
        status: "new",
        aiSummary: null,
        proposals: [],
        sourceEventId: ev.id,
      });
      alreadyImported.add(ev.id);
    }
    const nowIso = new Date().toISOString();
    setData((d) => ({
      ...d,
      inbox: [...d.inbox, ...newItems],
      meetingSources: d.meetingSources.map((s) =>
        s.projectId === d.currentProjectId ? { ...s, lastSyncedAt: nowIso } : s
      ),
    }));
    return newItems.length;
  }, [data]);

  const resetData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(seedData);
  }, []);

  return (
    <Ctx.Provider
      value={{
        data,
        ready,
        project,
        projectTasks,
        projectInbox,
        projectMeetingSources,
        invitedEvents,
        currentUser,
        setCurrentProject,
        addTask,
        updateTask,
        deleteTask,
        updateInbox,
        addProject,
        inviteMember,
        updateMember,
        removeMember,
        addMeetingSource,
        updateMeetingSource,
        removeMeetingSource,
        syncMeetings,
        resetData,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
