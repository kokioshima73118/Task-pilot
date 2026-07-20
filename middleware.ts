export { default } from "next-auth/middleware";

export const config = {
  // /api/* はルートハンドラ内で自前セッションチェックするため対象外
  // (fetch() 呼び出しがHTMLのサインイン画面にリダイレクトされて壊れるのを防ぐ)
  matcher: ["/((?!api|signin|_next/static|_next/image|favicon.ico).*)"],
};
