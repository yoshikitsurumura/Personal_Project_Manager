// @author Claude
// =============================================================================
// 優先度バッジコンポーネント
// タスクの優先度を色付きのバッジで視覚的に表示する。
// StatusBadge と同じパターンで実装されている。
// =============================================================================

import type { TaskPriority } from "@/types";

// 優先度ごとの Tailwind CSS クラス文字列
const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-700",    // グレー: 低
  medium: "bg-amber-100 text-amber-700", // イエロー: 中
  high: "bg-rose-100 text-rose-700",     // レッド: 高
};

// 優先度ごとの表示ラベル
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

/**
 * タスクの優先度をカラーバッジとして表示するコンポーネント。
 *
 * @param priority - 表示する優先度値
 */
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_STYLES[priority]}`}>
      優先度 {PRIORITY_LABELS[priority]}
    </span>
  );
}
