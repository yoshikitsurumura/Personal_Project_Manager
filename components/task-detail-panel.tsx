"use client";

// @author Claude
// =============================================================================
// タスク詳細パネル
// タスクの編集フォームを表示する右カラムコンポーネント。
// task が null の場合は「タスクを選択してください」を表示する。
// =============================================================================

import { useEffect, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import {
  DEFAULT_TASK_INPUT,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type Task,
  type TaskInput,
} from "@/types";
import type { Project } from "@/types";

/** TaskDetailPanel の props 型定義 */
type TaskDetailPanelProps = {
  task: Task | null;                                       // 表示・編集するタスク（null = 未選択）
  project: Project | null;
  tasks: Task[];
  isAiConfigured: boolean;
  onSave: (taskId: string, input: TaskInput) => Promise<void>; // 保存時のコールバック
  onDelete: (taskId: string) => Promise<void>;             // 削除時のコールバック
};

/**
 * タスクの詳細編集パネル。
 * Controlled Form パターン: フォームの値を state で管理し、
 * 保存ボタンが押されたときだけ Firestore に反映する。
 *
 * 学習ポイント:
 *   「フォームの一時状態」と「DB の確定データ」を分離する設計。
 *   task（DB の値）が変わったら useEffect でフォームを同期するが、
 *   ユーザーが入力中は form state（一時状態）だけが変わる。
 */
export function TaskDetailPanel({
  task,
  project,
  tasks,
  isAiConfigured,
  onSave,
  onDelete,
}: TaskDetailPanelProps) {
  // フォームの一時状態（task とは独立して管理する）
  const [form, setForm] = useState<TaskInput>(DEFAULT_TASK_INPUT);

  // 保存・削除処理中は true（ボタン二重クリック防止）
  const [isSubmitting, setIsSubmitting] = useState(false);

  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // task が変わったらフォームを最新の値で初期化する
  useEffect(() => {
    if (!task) {
      setForm(DEFAULT_TASK_INPUT); // タスク未選択時はデフォルト値にリセット
      return;
    }

    // DB の値をフォームに反映（ユーザーが入力中でも task 変更で上書きされる点に注意）
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    });
  }, [task]); // task が変わるたびに再実行

  // タスク未選択時は空状態を表示
  if (!task) {
    return (
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <EmptyState
          title="編集するタスクを選択してください"
          description="左の一覧からタスクを選ぶと、ここで内容を更新できます。"
        />
      </section>
    );
  }

  // task が null でないことを確定させるためのローカル変数（クロージャで参照するため）
  const activeTask = task;

  /**
   * フォームの送信（保存）ハンドラ。
   * event.preventDefault() でブラウザのデフォルト送信（ページリロード）を防ぐ。
   */
  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // デフォルトのフォーム送信をキャンセル
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(activeTask.id, {
        ...form,
        title: form.title.trim(),       // 前後の空白を除去して保存
        description: form.description.trim(),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存に失敗しました。");
    } finally {
      setIsSubmitting(false); // 成功・失敗に関わらず処理中フラグを解除
    }
  }

  /**
   * タスクの削除ハンドラ。
   * confirm でユーザーの確認を取ってから削除する。
   */
  async function handleDelete() {
    const shouldDelete = window.confirm("このタスクを削除しますか？");

    if (!shouldDelete) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onDelete(activeTask.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "削除に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateDraft() {
    if (!project || !isAiConfigured || !form.title.trim()) {
      return;
    }

    setIsDrafting(true);
    setDraftError(null);

    try {
      const response = await fetch("/api/ai/draft-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
          },
          taskTitle: form.title.trim(),
          tasks: tasks.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
            priority: item.priority,
            dueDate: item.dueDate,
          })),
        }),
      });

      const payload = (await response.json()) as { description?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "説明文草案の生成に失敗しました。");
      }

      setForm((current) => ({
        ...current,
        description: payload.description ?? current.description,
      }));
    } catch (draftingError) {
      setDraftError(
        draftingError instanceof Error ? draftingError.message : "説明文草案の生成に失敗しました。",
      );
    } finally {
      setIsDrafting(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Detail</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">タスク詳細</h2>
      </div>

      {/* onSubmit で handleSave を呼ぶ（Enter キーでも送信される） */}
      <form onSubmit={handleSave} className="mt-5 space-y-4">
        {/* タイトル入力 */}
        <Field label="タイトル" htmlFor="task-title">
          <input
            id="task-title"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
            value={form.title}
            // (current) => ({ ...current, title: ... }) は関数型更新。
            // 現在の state を受け取って新しい state を返す書き方（並行更新に安全）。
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="例: Firebase のセットアップを完了する"
            required // HTML バリデーション（空のまま送信できない）
          />
        </Field>

        {/* 説明入力 */}
        <Field label="説明" htmlFor="task-description">
          <textarea
            id="task-description"
            className="min-h-36 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="作業内容や補足を記録"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleGenerateDraft()}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isAiConfigured || isDrafting || !project || !form.title.trim()}
          >
            {isDrafting ? "草案生成中..." : "AIで説明文草案を作る"}
          </button>
          {!isAiConfigured ? (
            <p className="text-xs text-amber-700">AI 設定が未完了のため利用できません。</p>
          ) : null}
        </div>
        {draftError ? <p className="text-sm text-rose-600">{draftError}</p> : null}

        {/* ステータス / 優先度 / 期限 を 3 列で配置 */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* ステータス選択 */}
          <Field label="ステータス" htmlFor="task-status">
            <select
              id="task-status"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as Task["status"], // 型アサーションで TaskStatus に変換
                }))
              }
            >
              {/* TASK_STATUS_OPTIONS を使うことで types/index.ts と表示ラベルが一致する */}
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {/* 優先度選択 */}
          <Field label="優先度" htmlFor="task-priority">
            <select
              id="task-priority"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as Task["priority"],
                }))
              }
            >
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {/* 期限日入力（type="date" でブラウザ標準のカレンダー UI になる） */}
          <Field label="期限" htmlFor="task-due-date">
            <input
              id="task-due-date"
              type="date"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
              value={form.dueDate ?? ""} // null の場合は空文字にして input の value に渡す
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  // 空文字（未選択）なら null、それ以外は "YYYY-MM-DD" 文字列を保存
                  dueDate: event.target.value || null,
                }))
              }
            />
          </Field>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? "保存中..." : "タスクを保存"}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            削除
          </button>
        </div>
      </form>
    </section>
  );
}

/**
 * フォームフィールドのラベル + 入力要素をまとめるラッパーコンポーネント。
 * htmlFor を label に渡すことでラベルクリック時にフォーカスが移る（アクセシビリティ）。
 *
 * @param label    - ラベルのテキスト
 * @param htmlFor  - 対応する input/select/textarea の id
 * @param children - 実際の入力要素
 */
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    // htmlFor を label 要素に渡すと input と紐付けられる
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
