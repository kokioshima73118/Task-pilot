"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarEvent,
  InboxItem,
  MeetingSource,
  Member,
  Project,
  ProjectDoc,
  ServiceAccount,
  SocialAccount,
  SocialPost,
  Task,
} from "./types";

const LAST_PROJECT_KEY = "taskpilot-last-project";

interface StoreCtx {
  ready: boolean;
  projects: Project[]; // ログインユーザーが所属する全プロジェクト (軽量一覧)
  project: ProjectDoc; // 現在選択中プロジェクトのフルバンドル
  projectTasks: Task[];
  projectInbox: InboxItem[];
  projectMeetingSources: MeetingSource[];
  invitedEvents: CalendarEvent[]; // ログインユーザーが招待されている会議 (ライブ取得・非永続)
  projectAccounts: ServiceAccount[];
  projectSocialAccounts: SocialAccount[];
  projectSocialPosts: SocialPost[];
  currentUser: Member | null;
  setCurrentProject: (id: string) => void;
  addTask: (t: Partial<Task> & { title: string }) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateInbox: (id: string, patch: Partial<InboxItem>) => Promise<void>;
  addProject: (name: string, description: string) => void;
  inviteMember: (email: string, name: string) => Promise<void>;
  updateMember: (memberId: string, patch: Partial<Member>) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  addMeetingSource: (
    src: Omit<MeetingSource, "id" | "projectId" | "createdAt" | "lastSyncedAt">
  ) => Promise<void>;
  updateMeetingSource: (id: string, patch: Partial<MeetingSource>) => Promise<void>;
  removeMeetingSource: (id: string) => Promise<void>;
  syncMeetings: () => Promise<number>; // 取り込んだ件数を返す
  addAccount: (a: Omit<ServiceAccount, "id" | "projectId" | "createdAt">) => Promise<void>;
  updateAccount: (id: string, patch: Partial<ServiceAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addSocialAccount: (a: Omit<SocialAccount, "id" | "projectId">) => Promise<void>;
  updateSocialAccount: (id: string, patch: Partial<SocialAccount>) => Promise<void>;
  deleteSocialAccount: (id: string) => Promise<void>;
  addSocialPost: (p: Omit<SocialPost, "id" | "projectId">) => Promise<void>;
  updateSocialPost: (id: string, patch: Partial<SocialPost>) => Promise<void>;
  deleteSocialPost: (id: string) => Promise<void>;
}

const EMPTY_PROJECT: ProjectDoc = {
  id: "",
  name: "",
  description: "",
  color: "#6366f1",
  members: [],
  memberEmails: [],
  ownerEmail: "",
  createdAt: "",
  tasks: [],
  inbox: [],
  meetingSources: [],
  accounts: [],
  socialAccounts: [],
  socialPosts: [],
};

const Ctx = createContext<StoreCtx | null>(null);

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `API error ${res.status}`);
  return body as T;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<ProjectDoc>(EMPTY_PROJECT);
  const [ready, setReady] = useState(false);
  const [invitedEvents, setInvitedEvents] = useState<CalendarEvent[]>([]);
  const loadingProjectRef = useRef<string | null>(null);

  const loadProject = useCallback(async (id: string) => {
    if (loadingProjectRef.current === id) return;
    loadingProjectRef.current = id;
    try {
      const doc = await apiFetch<ProjectDoc>(`/api/projects/${id}`);
      setProject(doc);
      localStorage.setItem(LAST_PROJECT_KEY, id);
    } catch (e) {
      console.error("プロジェクトの読み込みに失敗しました", e);
    } finally {
      loadingProjectRef.current = null;
    }
  }, []);

  // 初回ロード: 所属プロジェクト一覧を取得し、最後に見ていたプロジェクト (無ければ先頭) を開く
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<Project[]>("/api/projects");
        if (cancelled) return;
        setProjects(list);
        if (list.length > 0) {
          const lastId = localStorage.getItem(LAST_PROJECT_KEY);
          const initialId = list.some((p) => p.id === lastId) ? (lastId as string) : list[0].id;
          await loadProject(initialId);
        }
      } catch (e) {
        console.error("プロジェクト一覧の取得に失敗しました", e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, loadProject]);

  // ログインユーザーが招待されている Google カレンダーの予定 (ライブ取得)
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    apiFetch<CalendarEvent[]>("/api/calendar/events")
      .then((events) => {
        if (!cancelled) setInvitedEvents(events);
      })
      .catch((e) => console.error("カレンダー予定の取得に失敗しました", e));
    return () => {
      cancelled = true;
    };
  }, [status]);

  const setCurrentProject = useCallback(
    (id: string) => {
      void loadProject(id);
    },
    [loadProject]
  );

  const currentUser = project.members.find((m) => m.email === session?.user?.email) ?? null;

  /** 現在のプロジェクトに対する CRUD 系 API を呼び、返ってきた最新ドキュメントで state を更新する。 */
  const mutate = useCallback(
    async (path: string, init: RequestInit) => {
      try {
        const updated = await apiFetch<ProjectDoc>(`/api/projects/${project.id}${path}`, init);
        setProject(updated);
      } catch (e) {
        console.error(`API呼び出しに失敗しました: ${path}`, e);
      }
    },
    [project.id]
  );

  const addTask = useCallback(
    (t: Partial<Task> & { title: string }) => {
      return mutate("/tasks", { method: "POST", body: JSON.stringify(t) });
    },
    [mutate]
  );
  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      return mutate(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    [mutate]
  );
  const deleteTask = useCallback(
    (id: string) => {
      return mutate(`/tasks/${id}`, { method: "DELETE" });
    },
    [mutate]
  );
  const updateInbox = useCallback(
    (id: string, patch: Partial<InboxItem>) => {
      return mutate(`/inbox/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    [mutate]
  );

  const addProject = useCallback((name: string, description: string) => {
    (async () => {
      try {
        const created = await apiFetch<ProjectDoc>("/api/projects", {
          method: "POST",
          body: JSON.stringify({ name, description }),
        });
        setProjects((ps) => [...ps, created]);
        setProject(created);
        localStorage.setItem(LAST_PROJECT_KEY, created.id);
      } catch (e) {
        console.error("プロジェクトの作成に失敗しました", e);
      }
    })();
  }, []);

  const inviteMember = useCallback(
    (email: string, name: string) => {
      return mutate("/members", { method: "POST", body: JSON.stringify({ email, name }) });
    },
    [mutate]
  );
  const updateMember = useCallback(
    (memberId: string, patch: Partial<Member>) => {
      return mutate(`/members/${memberId}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    [mutate]
  );
  const removeMember = useCallback(
    (memberId: string) => {
      return mutate(`/members/${memberId}`, { method: "DELETE" });
    },
    [mutate]
  );

  const addMeetingSource = useCallback(
    (src: Omit<MeetingSource, "id" | "projectId" | "createdAt" | "lastSyncedAt">) => {
      return mutate("/meeting-sources", { method: "POST", body: JSON.stringify(src) });
    },
    [mutate]
  );
  const updateMeetingSource = useCallback(
    (id: string, patch: Partial<MeetingSource>) => {
      return mutate(`/meeting-sources/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    [mutate]
  );
  const removeMeetingSource = useCallback(
    (id: string) => {
      return mutate(`/meeting-sources/${id}`, { method: "DELETE" });
    },
    [mutate]
  );

  const syncMeetings = useCallback(async (): Promise<number> => {
    try {
      const result = await apiFetch<{ imported: number; project: ProjectDoc }>(
        `/api/projects/${project.id}/sync-meetings`,
        { method: "POST" }
      );
      setProject(result.project);
      return result.imported;
    } catch (e) {
      console.error("会議の同期に失敗しました", e);
      return 0;
    }
  }, [project.id]);

  const addAccount = useCallback(
    (a: Omit<ServiceAccount, "id" | "projectId" | "createdAt">) => {
      return mutate("/accounts", { method: "POST", body: JSON.stringify(a) });
    },
    [mutate]
  );
  const updateAccount = useCallback(
    (id: string, patch: Partial<ServiceAccount>) => {
      return mutate(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    [mutate]
  );
  const deleteAccount = useCallback(
    (id: string) => {
      return mutate(`/accounts/${id}`, { method: "DELETE" });
    },
    [mutate]
  );

  const addSocialAccount = useCallback(
    (a: Omit<SocialAccount, "id" | "projectId">) => {
      return mutate("/social-accounts", { method: "POST", body: JSON.stringify(a) });
    },
    [mutate]
  );
  const updateSocialAccount = useCallback(
    (id: string, patch: Partial<SocialAccount>) => {
      return mutate(`/social-accounts/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    [mutate]
  );
  const deleteSocialAccount = useCallback(
    (id: string) => {
      return mutate(`/social-accounts/${id}`, { method: "DELETE" });
    },
    [mutate]
  );

  const addSocialPost = useCallback(
    (p: Omit<SocialPost, "id" | "projectId">) => {
      return mutate("/social-posts", { method: "POST", body: JSON.stringify(p) });
    },
    [mutate]
  );
  const updateSocialPost = useCallback(
    (id: string, patch: Partial<SocialPost>) => {
      return mutate(`/social-posts/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    [mutate]
  );
  const deleteSocialPost = useCallback(
    (id: string) => {
      return mutate(`/social-posts/${id}`, { method: "DELETE" });
    },
    [mutate]
  );

  return (
    <Ctx.Provider
      value={{
        ready,
        projects,
        project,
        projectTasks: project.tasks,
        projectInbox: project.inbox,
        projectMeetingSources: project.meetingSources,
        invitedEvents,
        projectAccounts: project.accounts,
        projectSocialAccounts: project.socialAccounts,
        projectSocialPosts: project.socialPosts,
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
        addAccount,
        updateAccount,
        deleteAccount,
        addSocialAccount,
        updateSocialAccount,
        deleteSocialAccount,
        addSocialPost,
        updateSocialPost,
        deleteSocialPost,
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
