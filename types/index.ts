// @author Claude
// =============================================================================
// 型定義ファイル
// アプリ全体で使う型・定数をここに集中管理する。
// TypeScript の型はコンパイル後に消えるため実行時コストはゼロ。
// =============================================================================

// -----------------------------------------------------------------------------
// Project（プロジェクト）
// Firestore の "projects" コレクション 1 ドキュメントに対応する型。
// -----------------------------------------------------------------------------
export type Project = {
  id: string;          // Firestore が自動生成するドキュメント ID
  ownerUid: string;    // 作成したユーザーの Firebase UID（アクセス制御に使う）
  name: string;        // プロジェクト名
  description: string; // 説明文
  createdAt: Date | null; // 作成日時（Firestore の serverTimestamp → Date に変換済み）
  updatedAt: Date | null; // 最終更新日時
};

// -----------------------------------------------------------------------------
// Task のステータス（進捗状態）
// ユニオン型で使える値を制限し、タイプミスをコンパイル時に検出できる。
// -----------------------------------------------------------------------------
export type TaskStatus = "todo" | "in_progress" | "done";

// -----------------------------------------------------------------------------
// Task の優先度
// -----------------------------------------------------------------------------
export type TaskPriority = "low" | "medium" | "high";

// -----------------------------------------------------------------------------
// Task（タスク）
// Firestore の "projects/{id}/tasks" サブコレクション 1 ドキュメントに対応する型。
// -----------------------------------------------------------------------------
export type Task = {
  id: string;              // Firestore ドキュメント ID
  projectId: string;       // 親プロジェクトの ID（サブコレクションなので保持しておく）
  title: string;           // タスクのタイトル
  description: string;     // タスクの詳細説明
  status: TaskStatus;      // 現在の進捗状態
  priority: TaskPriority;  // 優先度
  dueDate: string | null;  // 期限日（ISO 8601 形式の文字列 "YYYY-MM-DD"、未設定なら null）
  createdAt: Date | null;  // 作成日時
  updatedAt: Date | null;  // 最終更新日時
};

// -----------------------------------------------------------------------------
// ProjectInput
// フォームからプロジェクトを作成・更新するときに渡す値の型。
// id や createdAt など DB が管理するフィールドは含めない。
// -----------------------------------------------------------------------------
export type ProjectInput = {
  name: string;
  description: string;
};

// -----------------------------------------------------------------------------
// TaskInput
// フォームからタスクを作成・更新するときに渡す値の型。
// -----------------------------------------------------------------------------
export type TaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
};

// -----------------------------------------------------------------------------
// TaskFilters
// タスク一覧のフィルタリング・ソート状態を保持する型。
// "all" は「絞り込みなし（すべて表示）」を意味する。
// -----------------------------------------------------------------------------
export type TaskFilters = {
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  sortByDueDate: "asc" | "desc";
};

// -----------------------------------------------------------------------------
// ステータスの表示ラベル定数
// <select> のオプションや UI ラベルに使う。
// Record<TaskStatus, string> 相当の構造を配列で持つことで、
// 追加・削除時に型チェックが効く。
// -----------------------------------------------------------------------------
export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "未着手" },
  { value: "in_progress", label: "進行中" },
  { value: "done", label: "完了" },
];

// 優先度の表示ラベル定数
export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

// -----------------------------------------------------------------------------
// DEFAULT_TASK_INPUT
// 新規タスク作成フォームの初期値。
// フォームをリセットするときにもここを参照する。
// -----------------------------------------------------------------------------
export const DEFAULT_TASK_INPUT: TaskInput = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: null,
};
