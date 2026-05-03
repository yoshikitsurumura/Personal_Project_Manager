// @author Claude
// =============================================================================
// AI API の入出力スキーマと検証ロジック
// Route Handler が受け取る JSON ボディを型安全にパースし、
// AI モデルの生成結果を構造化データに変換する。
//
// Zod を入れずに手書きバリデーションで実装している理由:
//   依存を増やさずに学習用途として「バリデーションの仕組み」を理解できる。
//   複雑になったら Zod への移行を検討。
//
// 学習ポイント:
//   「パースする、検証する、変換する」を分けて考える。
//   unknown → 型ガードで安全に確認 → 型付きオブジェクトに変換。
//   これが TypeScript のベストプラクティス。
// =============================================================================

import type { Project, Task } from "@/types";

// -----------------------------------------------------------------------------
// リクエスト/レスポンス型定義
// Pick<T, K> で既存の型から必要なフィールドだけを抽出している。
//
// 学習ポイント:
//   Pick<Project, "id" | "name" | "description"> は
//   Project 型から id, name, description だけを持つ新しい型を作る。
//   こうすることで、createdAt や ownerUid などの
//   AI には不要なフィールドを含めないようにしている。
// -----------------------------------------------------------------------------

/** プロジェクト要約 API のリクエスト型 */
export type SummarizeProjectRequest = {
  project: Pick<Project, "id" | "name" | "description">;
  tasks: Array<Pick<Task, "id" | "title" | "description" | "status" | "priority" | "dueDate">>;
};

/** プロジェクト要約 API のレスポンス型 */
export type SummarizeProjectResponse = {
  summary: string;
};

/** 次アクション提案 API のリクエスト型（要約と同じ構造） */
export type SuggestNextActionsRequest = SummarizeProjectRequest;

/** 次アクション提案 API のレスポンス型 */
export type SuggestNextActionsResponse = {
  actions: string[];
};

/** タスク草案生成 API のリクエスト型 */
export type DraftTaskRequest = {
  project: Pick<Project, "id" | "name" | "description">;
  taskTitle: string; // 下書きを作りたいタスクのタイトル
  tasks: Array<Pick<Task, "id" | "title" | "description" | "status" | "priority" | "dueDate">>;
};

/** タスク草案生成 API のレスポンス型 */
export type DraftTaskResponse = {
  description: string;
};

// -----------------------------------------------------------------------------
// バリデーションヘルパー
// -----------------------------------------------------------------------------

/**
 * 値が「null でないオブジェクト」かどうかを判定する型ガード関数。
 *
 * 学習ポイント:
 *   TypeScript の型ガード（type predicate）。
 *   `value is Record<string, unknown>` と書くと、
 *   この関数が true を返した場合に value の型が絞り込まれる。
 *   typeof null === "object" なので null チェックも必要。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * モデル出力に混ざる Markdown のコードフェンス (```json ... ``` や ``` ... ```) を剥がす。
 * Gemini が responseMimeType を尊重しなかった場合のフォールバックとして使う。
 */
function stripCodeFences(text: string): string {
  const fenceMatch = text.trim().match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : text.trim();
}

// -----------------------------------------------------------------------------
// パーサー（unknown → 型付きオブジェクトへの変換）
// JSON.parse の結果は unknown なので、ここで安全に型付きに変換する。
// -----------------------------------------------------------------------------

/**
 * /api/ai/summarize-project の入力を検証してパースする。
 * 不正な入力なら Error をスローする。
 *
 * @param payload - JSON.parse 直後の unknown 値（req.json() の戻り値）
 * @returns SummarizeProjectRequest
 *
 * 学習ポイント:
 *   各フィールドを typeof でチェックしてから安全に代入する「防衛的プログラミング」。
 *   タスクの status/priority は許可リスト（リテラル比較）で検証し、
 *   不正値が来た場合はデフォルト値にフォールバックしている。
 *   フロントエンドのバグで不正なデータが送られても壊れない。
 */
export function parseSummarizeProjectRequest(payload: unknown): SummarizeProjectRequest {
  if (!isRecord(payload)) {
    throw new Error("Invalid request payload.");
  }

  const project = payload.project;
  const tasks = payload.tasks;

  // project の構造検証
  if (!isRecord(project) || typeof project.id !== "string" || typeof project.name !== "string") {
    throw new Error("Invalid project payload.");
  }
  // tasks は配列であること
  if (!Array.isArray(tasks)) {
    throw new Error("Invalid tasks payload.");
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: typeof project.description === "string" ? project.description : "",
    },
    // 各タスクをフィルターしてから安全にマッピング
    tasks: tasks
      .filter((task): task is Record<string, unknown> => isRecord(task))
      .map((task) => ({
        id: typeof task.id === "string" ? task.id : "",
        title: typeof task.title === "string" ? task.title : "",
        description: typeof task.description === "string" ? task.description : "",
        // status / priority はリテラル型なので許可リストでチェック
        // 不正な値にはデフォルト値を使う（エラーにはしない）
        status: task.status === "todo" || task.status === "in_progress" || task.status === "done" ? task.status : "todo",
        priority: task.priority === "low" || task.priority === "medium" || task.priority === "high" ? task.priority : "medium",
        dueDate: typeof task.dueDate === "string" ? task.dueDate : null,
      })),
  };
}

/**
 * AI モデルの出力テキストから要約レスポンスを取り出す。
 * モデルが JSON を返した場合はパースし、そうでなければ全文を summary として扱う。
 *
 * @param output - AI モデルが生成した生のテキスト
 * @returns SummarizeProjectResponse
 *
 * 学習ポイント:
 *   AI の出力は指定した JSON 形式で返ってくるとは限らない。
 *   ここでは「まず JSON パースを試し、失敗したら全文をそのまま使う」
 *   というフォールバック戦略をとっている。
 *   これにより、AI が形式通りでない応答を返しても UI が壊れない。
 */
export function parseSummaryFromModelOutput(output: string): SummarizeProjectResponse {
  const trimmed = stripCodeFences(output);
  try {
    // まず JSON としてパースを試みる
    const parsed = JSON.parse(trimmed) as { summary?: unknown };
    if (typeof parsed.summary === "string" && parsed.summary.trim()) {
      return { summary: parsed.summary.trim() };
    }
  } catch {
    // JSON でない場合はフォールバック（catch の中は空でOK）
  }

  // JSON パース失敗 or summary フィールドがない場合は全文を summary にする
  return { summary: trimmed };
}

/**
 * /api/ai/suggest-next-actions の入力パーサー。
 * リクエスト構造が summarize-project と同一なので再利用している。
 */
export function parseSuggestNextActionsRequest(payload: unknown): SuggestNextActionsRequest {
  return parseSummarizeProjectRequest(payload);
}

/**
 * AI モデルの出力テキストから次アクション提案を取り出す。
 * JSON パースを試み、失敗したらテキストを行ごとに分割して提案に変換する。
 *
 * @param output - AI モデルが生成した生のテキスト
 * @returns SuggestNextActionsResponse（actions は最大 3 件）
 *
 * 学習ポイント:
 *   正規表現で行頭の箇条書き記号（-, *, 数字. など）を除去している。
 *   例: "- やること1" は "やること1" になる。
 *   .filter(Boolean) は falsy な値（空文字列 ""）を除外する慣用句。
 */
export function parseActionsFromModelOutput(output: string): SuggestNextActionsResponse {
  const trimmed = stripCodeFences(output);
  try {
    const parsed = JSON.parse(trimmed) as { actions?: unknown };
    if (Array.isArray(parsed.actions)) {
      const actions = parsed.actions
        .filter((item): item is string => typeof item === "string") // 文字列のみ
        .map((item) => item.trim())   // 前後空白を除去
        .filter(Boolean)              // 空文字を除外
        .slice(0, 3);                 // 最大 3 件に制限
      if (actions.length > 0) {
        return { actions };
      }
    }
  } catch {
    // JSON でなければフォールバック
  }

  // フォールバック: 行ごとに分割して箇条書き記号を除去
  const fallbackActions = trimmed
    .split("\n")
    .map((line) => line.replace(/^\s*[-*\d.、]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return { actions: fallbackActions };
}

/**
 * /api/ai/draft-task の入力パーサー。
 * summarize-project のパーサーを再利用しつつ、taskTitle を追加で取り出す。
 *
 * @param payload - JSON.parse 直後の unknown 値
 * @returns DraftTaskRequest
 */
export function parseDraftTaskRequest(payload: unknown): DraftTaskRequest {
  if (!isRecord(payload)) {
    throw new Error("Invalid request payload.");
  }

  // project と tasks は共通のパーサーで処理
  const parsed = parseSummarizeProjectRequest(payload);

  // taskTitle は必須（空文字ならエラー）
  const taskTitle = typeof payload.taskTitle === "string" ? payload.taskTitle.trim() : "";
  if (!taskTitle) {
    throw new Error("Invalid task title.");
  }

  return {
    project: parsed.project,
    tasks: parsed.tasks,
    taskTitle,
  };
}

/**
 * AI モデルの出力テキストからタスク説明文の草案を取り出す。
 * parseSummaryFromModelOutput と同じフォールバック戦略。
 *
 * @param output - AI モデルが生成した生のテキスト
 * @returns DraftTaskResponse
 */
export function parseDraftDescriptionFromModelOutput(output: string): DraftTaskResponse {
  const trimmed = stripCodeFences(output);
  try {
    const parsed = JSON.parse(trimmed) as { description?: unknown };
    if (typeof parsed.description === "string" && parsed.description.trim()) {
      return { description: parsed.description.trim() };
    }
  } catch {
    // JSON でなければフォールバック
  }

  return { description: trimmed };
}
