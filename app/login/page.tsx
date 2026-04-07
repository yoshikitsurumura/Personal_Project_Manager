"use client";

// @author Claude
// =============================================================================
// ログインページ
// 未認証ユーザーが最初に見るランディングページ。
// Firebase Authentication の Google ログインを提供する。
// =============================================================================

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/app/providers";
import { LoadingScreen } from "@/components/loading-screen";
import { SetupNotice } from "@/components/setup-notice";

export default function LoginPage() {
  // useRouter: プログラムによるページ遷移に使う（<Link> は宣言的なリンク、router は手動遷移）
  const router = useRouter();

  // Context からログイン状態・設定状態・サインイン関数を取得
  const { user, loading, isConfigured, signInWithGoogle } = useAuth();

  // ログイン処理中のエラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // ボタン連打防止フラグ
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ログイン済みのユーザーがこのページを開いた場合はプロジェクト一覧へリダイレクト
  // loading 中はまだ認証状態が確定していないので待つ
  useEffect(() => {
    if (!loading && user) {
      // replace: 戻るボタンでログイン画面に戻れないようにする
      router.replace("/projects");
    }
  }, [loading, router, user]);

  // Firebase が未設定の場合は設定方法を案内する画面を表示
  if (!isConfigured) {
    return (
      <main className="min-h-screen px-6 py-14">
        <SetupNotice />
      </main>
    );
  }

  // ログイン中（user がいて loading 中）はリダイレクト待ちの表示
  if (loading && user) {
    return <LoadingScreen label="プロジェクト画面へ移動しています..." />;
  }

  /**
   * Google ログインボタンが押されたときの処理。
   * エラーは state に保存してユーザーに見せる（例外をそのままスローしない）。
   */
  async function handleSignIn() {
    setIsSubmitting(true);
    setError(null);

    try {
      await signInWithGoogle(); // ポップアップを開いて Google 認証
      // 認証成功後は onAuthStateChanged → useEffect のリダイレクトが処理してくれる
    } catch (signInError) {
      // instanceof で Error 型を確認してからメッセージを取得（型安全）
      setError(signInError instanceof Error ? signInError.message : "ログインに失敗しました。");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-5xl overflow-hidden rounded-[40px] border border-slate-200 bg-white shadow-xl">
        <div className="grid min-h-[640px] lg:grid-cols-[1.15fr_0.85fr]">
          {/* 左カラム: アプリの紹介 */}
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(29,78,216,0.35),_transparent_46%),linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] p-10 text-white">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-100">
              Firebase + Docker + k8s
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight">
              個人開発の土台を、そのまま学習環境にする。
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-blue-50/90">
              このアプリは、Next.js と Firebase を使った個人用プロジェクト管理ツールです。
              Docker と Kubernetes 前提で構成し、実装・デバッグ・ドキュメント作成の流れまで含めて学べるようにしています。
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <FeatureCard title="Project CRUD" description="まずは基本の CRUD と画面遷移を固める" />
              <FeatureCard title="Task Detail" description="一覧と詳細編集で状態管理を練習する" />
              <FeatureCard title="Firebase Auth" description="Google ログインで実践的な認証を学ぶ" />
              <FeatureCard title="Docker / k8s" description="本番前提のコンテナ構成まで触れる" />
            </div>
          </div>

          {/* 右カラム: ログインフォーム */}
          <div className="flex items-center bg-slate-50 p-8">
            <div className="w-full rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-700">Login</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Google でサインイン</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Firebase Authentication を使ってログインし、自分のプロジェクトだけを扱えるようにします。
              </p>

              {/* void で Promise を明示的に無視（onClick は非同期を直接扱えないため） */}
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="mt-8 flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isSubmitting} // 処理中はボタンを無効化して二重送信を防ぐ
              >
                {isSubmitting ? "ログイン中..." : "Google でログイン"}
              </button>

              {/* エラーがあるときだけ表示（条件付きレンダリング） */}
              {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

              <div className="mt-8 rounded-2xl bg-blue-50 p-4 text-sm leading-7 text-blue-950">
                <p className="font-semibold">学習ポイント</p>
                <p className="mt-2">
                  認証状態はアプリ全体の Provider で購読し、画面はその状態を参照する構成にしています。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/**
 * 機能紹介カード（ログイン画面の左カラムに並ぶ小さいカード）
 * ページ内専用の小さいコンポーネント。外から使わないためこのファイルに同居させている。
 */
function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-50">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-blue-50/90">{description}</p>
    </div>
  );
}
