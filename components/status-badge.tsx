// @author Claude
// =============================================================================
// ステータスバッジコンポーネント
// タスクのステータスを色付きのバッジで視覚的に表示する。
// =============================================================================

import type { TaskStatus } from "@/types";

// ステータスごとの Tailwind CSS クラス文字列
// Record<K, V> は「K のすべてのキーに対して V 型の値を持つオブジェクト」の型。
// TaskStatus の全ケースが揃っていないとコンパイルエラーになる（型安全）。
const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700",       // グレー: 未着手
  in_progress: "bg-blue-100 text-blue-700",  // ブルー: 進行中
  done: "bg-emerald-100 text-emerald-700",   // グリーン: 完了
};

// ステータスごとの表示ラベル
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "未着手",
  in_progress: "進行中",
  done: "完了",
};

/**
 * タスクのステータスをカラーバッジとして表示するコンポーネント。
 *
 * @param status - 表示するステータス値
 *
 * 学習ポイント:
 *   STATUS_STYLES と STATUS_LABELS を Record で管理することで、
 *   新しいステータスを追加したとき型エラーでスタイルとラベルの追加漏れに気づける。
 */
export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    // テンプレートリテラルで共通クラスとステータスごとのクラスを結合
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
