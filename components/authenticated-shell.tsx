"use client";

// @author Claude
// =============================================================================
// 認証済みユーザー向けシェル（共通レイアウト）
// ログインが必要な画面を包むラッパーコンポーネント。
// - 未設定 → SetupNotice を表示
// - 認証確認中 → ローディング
// - 未ログイン → /login にリダイレクト
// - ログイン済み → ヘッダー付きのレイアウトを表示
// =============================================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/app/providers";
import { LoadingScreen } from "@/components/loading-screen";
import { SetupNotice } from "@/components/setup-notice";

/**
 * ログイン済みユーザー向けのページ共通レイアウト。
 * 認証チェック・リダイレクトをここに集中させることで、
 * 各ページが認証ロジックを重複して書かなくて済む。
 *
 * @param title       - ページタイトル（ヘッダーの h1 に表示）
 * @param description - ページの説明文（ヘッダー下に表示）
 * @param children    - ページ固有のコンテンツ
 */
export function AuthenticatedShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const router = useRouter();

  // Context からログイン状態・設定状態・サインアウト関数を取得
  const { user, loading, isConfigured, signOutUser } = useAuth();

  useEffect(() => {
    // loading 中はまだ確認できていないので待つ
    // user がいれば認証済みなので何もしない
    // isConfigured でなければ Firebase 未設定なのでリダイレクトしない（SetupNotice を表示する）
    if (!loading && !user && isConfigured) {
      router.replace("/login"); // 未ログインなら強制的にログイン画面へ
    }
  }, [isConfigured, loading, router, user]);

  // Firebase が未設定の場合は設定手順を案内
  if (!isConfigured) {
    return (
      <main className="min-h-screen px-6 py-14">
        <SetupNotice />
      </main>
    );
  }

  // 認証状態の確認中
  if (loading) {
    return <LoadingScreen label="認証状態を確認しています..." />;
  }

  // 未ログインの場合（useEffect のリダイレクトを待つ間の一瞬の表示）
  if (!user) {
    return <LoadingScreen label="ログイン画面へ移動しています..." />;
  }

  // 認証済み: ヘッダー + コンテンツを表示
  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl">
        {/* アプリ共通ヘッダー */}
        <header className="rounded-[36px] border border-slate-200 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-blue-700">
                Personal Project Manager
              </p>
              {/* props で受け取ったタイトルと説明を表示 */}
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* プロジェクト一覧へのナビゲーションリンク */}
              <Link
                href="/projects"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Projects
              </Link>
              {/* ログイン中ユーザーの名前またはメールを表示 */}
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {user.displayName || user.email}
              </div>
              {/* サインアウトボタン */}
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        {/* 各ページのコンテンツ */}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
