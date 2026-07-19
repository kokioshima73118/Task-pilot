"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppData, InboxItem, Member, Project, Task } from "./types";
import { seedData } from "./seed";

const STORAGE_KEY = "taskpilot-data-v1";

interface StoreCtx {
  data: AppData;
  ready: boolean;
  project: Project; // 現在のプロジェクト
  projectTasks: Task[];
  projectInbox: InboxItem[];
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
      if (raw) setData(JSON.parse(raw));
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
