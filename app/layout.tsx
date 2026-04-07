// @author Claude
// =============================================================================
// ルートレイアウト（Server Component）
// Next.js App Router の最上位レイアウト。
// すべてのページはここで囲まれた <html> / <body> の中にレンダリングされる。
//
// 学習ポイント:
//   このファイルは Server Component（"use client" がない）なので、
//   サーバー側でのみ実行される。process.env も安全に読める。
//   クライアントに渡したい値は props 経由で子コンポーネントに渡す。
// =============================================================================

import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { Providers } from "@/app/providers";
import { readAiRuntimeConfig } from "@/lib/ai/runtime-config";
import { readFirebaseWebConfig } from "@/lib/firebase/runtime-config";

// metadata は Next.js が <head> の <title> と <meta name="description"> に使う
export const metadata: Metadata = {
  title: "個人用プロジェクト管理",
  description: "Firebase と Docker/Kubernetes を学びながら作る個人用タスク管理アプリ",
};

/**
 * アプリ全体を包むルートレイアウト。
 *
 * @param children - 各ページのコンテンツ（Next.js が自動でここに挿入する）
 *
 * 学習ポイント:
 *   readFirebaseWebConfig() はサーバー側で環境変数を読む。
 *   値を <Providers> に props として渡すことで、
 *   クライアント側のコードが環境変数に直接アクセスしなくて済む。
 *   （クライアントから process.env を読もうとしても undefined になる）
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // サーバー側で Firebase の設定を読み取る（環境変数が揃っていなければ null）
  const firebaseConfig = readFirebaseWebConfig();
  const aiConfig = readAiRuntimeConfig();

  return (
    <html lang="ja">
      <body>
        {/* firebaseConfig を Providers に渡してクライアント側で使えるようにする */}
        <Providers firebaseConfig={firebaseConfig} aiConfigured={Boolean(aiConfig)}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
