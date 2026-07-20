import { Member, ProjectDoc } from "@/lib/types";

export const AVATAR_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#ef4444",
];

export function buildNewProjectDoc(
  ownerEmail: string,
  ownerName: string,
  name: string,
  description: string
): Omit<ProjectDoc, "id"> {
  const owner: Member = {
    id: "m_" + Math.random().toString(36).slice(2, 9),
    name: ownerName,
    email: ownerEmail,
    avatarColor: AVATAR_COLORS[0],
    role: "owner",
    status: "active",
  };
  return {
    name,
    description,
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    ownerEmail,
    createdAt: new Date().toISOString(),
    members: [owner],
    memberEmails: [ownerEmail],
    tasks: [],
    inbox: [],
    meetingSources: [],
    accounts: [],
    socialAccounts: [],
    socialPosts: [],
  };
}
