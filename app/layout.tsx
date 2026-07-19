import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "TaskPilot — AI タスク管理",
  description:
    "Googleカレンダー・Google Chat と連携し、AIがタスクを自動抽出するタスク管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <StoreProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 ml-60">{children}</main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
