"use client";

// @author Claude
// =============================================================================
// プロジェクトフォームコンポーネント
// プロジェクトの作成・編集どちらにも使える汎用フォーム。
// initialValue が空（デフォルト）なら「作成モード」、
// 値がある場合は「編集モード」として動作する。
// =============================================================================

import { useEffect, useState } from "react";

import type { ProjectInput } from "@/types";

/** ProjectForm の props 型定義 */
type ProjectFormProps = {
  initialValue?: ProjectInput;                        // 編集モード時の初期値（省略なら空のフォーム）
  submitLabel: string;                                // 送信ボタンのラベル（例: "プロジェクトを作成"）
  onSubmit: (input: ProjectInput) => Promise<void>;   // 送信時のコールバック
  onCancel?: () => void;                              // キャンセル時のコールバック（省略可）
};

// 新規作成モードの初期値（空文字）
const EMPTY_PROJECT: ProjectInput = {
  name: "",
  description: "",
};

/**
 * プロジェクトの作成・編集フォームコンポーネント。
 * フォームの状態は内部で管理し（Uncontrolled ではなく Controlled）、
 * submit 時に親の onSubmit を呼ぶ。
 */
export function ProjectForm({
  initialValue = EMPTY_PROJECT, // デフォルト引数で省略時は空フォーム
  submitLabel,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  // フォームの入力値
  const [form, setForm] = useState<ProjectInput>(initialValue);

  // 送信処理中フラグ（ボタン二重クリック防止）
  const [isSubmitting, setIsSubmitting] = useState(false);

  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // initialValue が変わったときにフォームを同期する
  // （編集モードでプロジェクトが切り替わる場合に対応）
  useEffect(() => {
    setForm(initialValue);
  }, [initialValue]);

  /**
   * フォーム送信ハンドラ。
   * trim() で前後の空白を除去してから onSubmit に渡す。
   * 新規作成モードでは送信後にフォームをリセットする。
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // ブラウザのデフォルトフォーム送信（ページリロード）を防ぐ
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
      });

      // 新規作成モード（initialValue が空）の場合は送信後にフォームをクリア
      // 編集モードでは初期値があるため、この条件は false になる
      if (!initialValue.name && !initialValue.description) {
        setForm(EMPTY_PROJECT);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* プロジェクト名 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="project-name">
          プロジェクト名
        </label>
        <input
          id="project-name"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
          value={form.name}
          // スプレッド構文で他フィールドを保持しつつ name だけ更新
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="例: 個人サイト改善"
          required // 空のまま送信できない
        />
      </div>

      {/* 説明 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="project-description">
          説明
        </label>
        <textarea
          id="project-description"
          className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          placeholder="このプロジェクトでやりたいことを短くメモ"
        />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "保存中..." : submitLabel}
        </button>
        {/* onCancel が渡された場合のみキャンセルボタンを表示（条件付きレンダリング） */}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            キャンセル
          </button>
        ) : null}
      </div>
    </form>
  );
}
