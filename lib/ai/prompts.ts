// @author Claude
// =============================================================================
// プロンプト生成ロジック
// AI に投げる文字列を組み立てる純粋関数の集まり。
//
// 設計方針:
//   - プロンプトを 1 ファイルに集約し、文言変更時の影響範囲を最小化
//   - 純粋関数（副作用なし）にすることでテストしやすくする
//   - JSON 形式の出力を指示して、パース可能な構造化レスポンスを得る
//
// 学習ポイント:
//   AI への指示は「ロール / 入力データ / 出力ルール」の3パートに分けると安定する。
//   出力形式を JSON で明示すると、フリーテキストよりも後処理が楽になる。
// =============================================================================

// -----------------------------------------------------------------------------
// 入力型定義
// Firestore の Project / Task から AI に渡す最小限のフィールドだけを抜いた型。
// プロンプトに不要なフィールド（createdAt, ownerUid など）を含めないことで
// トークン消費を節約する。
// -----------------------------------------------------------------------------

/** プロンプト用のプロジェクト情報 */
type SummaryProjectInput = {
  name: string;
  description: string;
};

/** プロンプト用のタスク情報 */
type SummaryTaskInput = {
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
};

// -----------------------------------------------------------------------------
// 内部ヘルパー
// -----------------------------------------------------------------------------

/**
 * タスク 1 件を番号付きの 1 行テキストに整形する。
 * AI が読み取りやすいようにステータス・優先度・期限をブラケットで囲む。
 *
 * @param task  - 整形するタスク
 * @param index - 配列内のインデックス（1始まりの番号にするため +1 する）
 * @returns 例: "1. [todo] [high] Firebase セットアップ (期限: 2024-06-10)"
 */
function formatTaskLine(task: SummaryTaskInput, index: number) {
  const dueDate = task.dueDate ?? "未設定";
  return `${index + 1}. [${task.status}] [${task.priority}] ${task.title} (期限: ${dueDate})`;
}

/**
 * タスク配列を複数行のテキストに整形する。
 * タスクがない場合は空であることを明示するテキストを返す。
 */
function formatTasks(tasks: SummaryTaskInput[]) {
  if (tasks.length === 0) {
    return "タスクは登録されていません。";
  }
  return tasks.map((task, index) => formatTaskLine(task, index)).join("\n");
}

// -----------------------------------------------------------------------------
// プロンプトビルダー関数
// 各 API エンドポイントに対応する関数を 1 つずつ定義している。
// -----------------------------------------------------------------------------

/**
 * プロジェクト要約用のプロンプトを組み立てる。
 * /api/ai/summarize-project から呼ばれる。
 *
 * @param project - プロジェクト名・説明
 * @param tasks   - タスク一覧（maxInputTasks 以下に切り詰め済み）
 *
 * 学習ポイント:
 *   配列.join("\n") でテンプレートを組み立てると、
 *   テンプレートリテラルよりもインデントが崩れにくく可読性が高い。
 *   出力形式に {"summary":"..."} を指定することで、
 *   schemas.ts の parseSummaryFromModelOutput で JSON パース → 文字列抽出ができる。
 */
export function buildProjectSummaryPrompt(project: SummaryProjectInput, tasks: SummaryTaskInput[]) {
  const tasksText = formatTasks(tasks);

  return [
    // ロール定義
    "あなたはプロジェクトマネージャー補助AIです。",
    "以下の情報をもとに、短く実務的な日本語で要約してください。",
    // 出力形式の指定
    "出力は次のJSON形式のみを返してください。",
    '{"summary":"..."}',
    "",
    // 入力データ
    `プロジェクト名: ${project.name}`,
    `プロジェクト説明: ${project.description || "（説明なし）"}`,
    "タスク一覧:",
    tasksText,
    "",
    // 出力ルール
    "要約ルール:",
    "- 3〜6文程度",
    "- 現状、詰まり、直近アクションを含める",
    "- 推測は避け、入力情報ベースで書く",
  ].join("\n");
}

/**
 * 次アクション提案用のプロンプトを組み立てる。
 * /api/ai/suggest-next-actions から呼ばれる。
 *
 * @param project - プロジェクト名・説明
 * @param tasks   - タスク一覧
 *
 * 学習ポイント:
 *   提案を 3 件に絞る指示を入れておくことで、
 *   モデルが大量に列挙するのを防ぐ。
 *   {"actions":["..."]} の形式を指定して構造化出力を得る。
 */
export function buildNextActionsPrompt(project: SummaryProjectInput, tasks: SummaryTaskInput[]) {
  return [
    "あなたはプロジェクトマネージャー補助AIです。",
    "以下の情報をもとに、優先順の次アクションを提案してください。",
    "出力は次のJSON形式のみを返してください。",
    '{"actions":["...","...","..."]}',
    "",
    `プロジェクト名: ${project.name}`,
    `プロジェクト説明: ${project.description || "（説明なし）"}`,
    "タスク一覧:",
    formatTasks(tasks),
    "",
    "提案ルール:",
    "- actions は 3 件まで",
    "- 1 件は短く具体的な実行文にする",
    "- 優先度・進捗・期限を踏まえる",
    "- 推測は避け、入力情報ベースで書く",
  ].join("\n");
}

/**
 * タスク説明文の下書き生成用プロンプトを組み立てる。
 * /api/ai/draft-task から呼ばれる。
 *
 * @param project   - プロジェクト名・説明（文脈として渡す）
 * @param taskTitle - 下書きを作りたいタスクのタイトル
 * @param tasks     - 既存タスク一覧（重複や矛盾を避けるための参考情報）
 *
 * 学習ポイント:
 *   既存タスク一覧も渡すのは、AI が文脈を理解して
 *   既にあるタスクと重複しない説明文を生成できるようにするため。
 */
export function buildTaskDraftPrompt(project: SummaryProjectInput, taskTitle: string, tasks: SummaryTaskInput[]) {
  return [
    "あなたはタスク整理を支援するAIです。",
    "以下の情報をもとに、タスク説明文の下書きを作成してください。",
    "出力は次のJSON形式のみを返してください。",
    '{"description":"..."}',
    "",
    `プロジェクト名: ${project.name}`,
    `プロジェクト説明: ${project.description || "（説明なし）"}`,
    `対象タスク名: ${taskTitle}`,
    "既存タスク一覧:",
    formatTasks(tasks),
    "",
    "作成ルール:",
    "- 2〜5文程度",
    "- 目的、実施内容、完了条件を含める",
    "- 曖昧語を避け、すぐ作業できる内容にする",
    "- 推測は避け、入力情報ベースで書く",
  ].join("\n");
}
