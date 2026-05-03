"use client";

// @author Claude
// =============================================================================
// タスク一覧コンポーネント
// フィルター・ソートコントロール + タスクカードの一覧を表示する。
// タスクの選択状態は親（ProjectDetailScreen）が持つ。
// =============================================================================

import { EmptyState } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import type { Task, TaskFilters, TaskPriority, TaskStatus } from "@/types";

/** TaskList コンポーネントの props 型定義 */
type TaskListProps = {
  tasks: Task[];                                   // フィルター済みタスク配列
  selectedTaskId: string | null;                   // 現在選択中のタスク ID
  filters: TaskFilters;                            // 現在のフィルター状態
  onFiltersChange: (filters: TaskFilters) => void; // フィルター変更時のコールバック
  onSelectTask: (taskId: string) => void;          // タスク選択時のコールバック
  onCreateTask: () => Promise<void>;               // 新規タスク作成コールバック
};

/**
 * タスク一覧コンポーネント。
 * フィルター操作と選択はすべて親 (ProjectDetailScreen) の state で管理し、
 * このコンポーネントは「表示 + イベント通知」のみを担う（Controlled Component パターン）。
 */
export function TaskList({
  tasks,
  selectedTaskId,
  filters,
  onFiltersChange,
  onSelectTask,
  onCreateTask,
}: TaskListProps) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
      {/* ヘッダー: タイトルと新規作成ボタン */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Tasks</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">タスク一覧</h2>
        </div>
        {/* void で非同期関数の戻り値を無視（onClick は Promise を返してはいけないため） */}
        <button
          type="button"
          onClick={() => void onCreateTask()}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          新しいタスク
        </button>
      </div>

      {/* フィルターコントロール: ステータス / 優先度 / 期限順 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {/* ステータスフィルター */}
        <FilterSelect
          label="ステータス"
          value={filters.status}
          onChange={(value) =>
            // スプレッド構文で既存フィルターをコピーしてから status だけ更新
            onFiltersChange({ ...filters, status: value as TaskStatus | "all" })
          }
          options={[
            { value: "all", label: "すべて" },
            { value: "todo", label: "未着手" },
            { value: "in_progress", label: "進行中" },
            { value: "done", label: "完了" },
          ]}
        />
        {/* 優先度フィルター */}
        <FilterSelect
          label="優先度"
          value={filters.priority}
          onChange={(value) =>
            onFiltersChange({ ...filters, priority: value as TaskPriority | "all" })
          }
          options={[
            { value: "all", label: "すべて" },
            { value: "low", label: "低" },
            { value: "medium", label: "中" },
            { value: "high", label: "高" },
          ]}
        />
        {/* 期限日ソート */}
        <FilterSelect
          label="期限順"
          value={filters.sortByDueDate}
          onChange={(value) =>
            onFiltersChange({ ...filters, sortByDueDate: value as "asc" | "desc" })
          }
          options={[
            { value: "asc", label: "近い順" },
            { value: "desc", label: "遠い順" },
          ]}
        />
      </div>

      {/* タスクカード一覧 */}
      <div className="mt-5 space-y-3">
        {tasks.length === 0 ? (
          <EmptyState
            title="タスクがまだありません"
            description="最初のタスクを作成して、一覧と詳細編集の流れを試してください。"
          />
        ) : (
          tasks.map((task) => {
            const isSelected = task.id === selectedTaskId;

            return (
              // ボタンとして実装することでキーボード操作（Tab + Enter）に対応
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task.id)}
                // テンプレートリテラルで選択状態に応じてスタイルを切り替える
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-sm"    // 選択中
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white" // 非選択
                }`}
              >
                {/* バッジ: ステータス + 優先度 */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{task.title || "無題タスク"}</h3>
                {/* line-clamp-2 は Tailwind の CSS truncation（2 行を超えると ... になる） */}
                <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">
                  {task.description || "詳細説明はまだありません。"}
                </p>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  期限: {task.dueDate ? task.dueDate : "未設定"}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

/** FilterSelect の props 型定義 */
type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

/**
 * フィルター用のセレクトボックスコンポーネント。
 * <label> の子として <select> を配置する「ラッピング型」の紐付けで
 * アクセシビリティを確保する（htmlFor / id を書かなくても同じ効果になる）。
 *
 * 学習ポイント:
 *   ラベルと入力要素を紐づける方法は 2 つある:
 *   1) 明示: <label htmlFor="foo">...</label> + <input id="foo" />
 *   2) 暗黙: <label>...<input /></label>（ここで採用）
 *   どちらもラベルクリックで入力にフォーカスが移る。
 *   2 の方がマークアップがシンプルで、id を他と重複しないよう管理する必要も無い。
 */
function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
        value={value}
        // event.target.value で選択された option の value を取得して親に通知
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
