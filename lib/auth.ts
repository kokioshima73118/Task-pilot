import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "./server/firestoreAdmin";
import { buildNewProjectDoc } from "./server/newProjectDoc";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken ?? "",
      }),
    });
    const refreshed = await res.json();
    if (!res.ok) throw refreshed;
    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      // Google はリフレッシュ時に新しい refresh_token を返さないことが多いので既存のものを維持する
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (e) {
    console.error("Google アクセストークンのリフレッシュに失敗しました", e);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

/**
 * ログイン成功時に、このメールアドレス宛の招待 (status: "invited") を自動で有効化する。
 * どのプロジェクトにも属していなければスタータープロジェクトを新規作成する。
 */
async function activateInvitesAndBootstrap(email: string, name: string) {
  const db = getDb();
  const snap = await db.collection("projects").where("memberEmails", "array-contains", email).get();

  if (snap.empty) {
    await db.collection("projects").add(buildNewProjectDoc(email, name, "マイプロジェクト", ""));
    return;
  }

  const batch = db.batch();
  let changed = false;
  for (const doc of snap.docs) {
    const data = doc.data() as { members: { email: string; status: string }[] };
    let docChanged = false;
    const members = data.members.map((m) => {
      if (m.email === email && m.status === "invited") {
        docChanged = true;
        return { ...m, status: "active" };
      }
      return m;
    });
    if (docChanged) {
      batch.update(doc.ref, { members });
      changed = true;
    }
  }
  if (changed) await batch.commit();
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        await activateInvitesAndBootstrap(user.email, user.name ?? user.email.split("@")[0]);
      } catch (e) {
        // 招待の自動反映に失敗してもログイン自体はブロックしない
        console.error("activateInvitesAndBootstrap failed", e);
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600_000,
        };
      }
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
