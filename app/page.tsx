// @author Claude
// =============================================================================
// ルートページ（/）
// トップ URL（http://localhost:3000/）にアクセスしたときの処理。
// 画面は描画せず、即座に /projects へリダイレクトする。
//
// 学習ポイント:
//   redirect() は Next.js App Router のサーバーサイドリダイレクト関数。
//   Server Component（"use client" がないファイル）から呼べる。
//   内部的には HTTP 307（Temporary Redirect）を返し、
//   ブラウザの履歴に / を残さず /projects に遷移する。
//
//   クライアント側の router.replace() と違い、
//   サーバー側で完結するため JavaScript が実行される前にリダイレクトされる。
// =============================================================================

import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/projects");
}
