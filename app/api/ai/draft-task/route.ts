// @author Claude
// =============================================================================
// タスク草案生成 API
// POST /api/ai/draft-task
//
// タスクのタイトルとプロジェクト文脈を受け取り、
// タスクの説明文の下書きを AI で生成して返す。
// ユーザーの入力を上書きするのではなく「初期案」として提供する設計。
//
// データフロー:
//   クライアント (task-detail-panel.tsx の草案生成ボタン)
//     → この Route Handler
//       → prompts.ts の buildTaskDraftPrompt でプロンプト組み立て
//       → Gemini API に送信
//       → schemas.ts の parseDraftDescriptionFromModelOutput でパース
//     → { description: "..." } を返す
// =============================================================================

import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/ai/auth";
import {
  AiConfigurationError,
  AiRequestError,
  AiUnauthorizedError,
} from "@/lib/ai/errors";
import { createGeminiProvider } from "@/lib/ai/gemini";
import { buildTaskDraftPrompt } from "@/lib/ai/prompts";
import {
  parseDraftDescriptionFromModelOutput,
  parseDraftTaskRequest,
} from "@/lib/ai/schemas";
import { readAiRuntimeConfig } from "@/lib/ai/runtime-config";

/**
 * POST /api/ai/draft-task
 *
 * @param request - { project: {...}, taskTitle: string, tasks: [...] }
 * @returns 200: { description: string } - 生成された説明文の草案
 * @returns 400/502/503: { error: string }
 *
 * 学習ポイント:
 *   このエンドポイントは他の 2 つと違い、taskTitle という追加パラメータがある。
 *   parseDraftTaskRequest が内部で parseSummarizeProjectRequest を再利用しつつ
 *   taskTitle だけを追加で取り出す構成になっている（DRY 原則）。
 */
export async function POST(request: Request) {
  try {
    // ① クライアントの Firebase ID Token を検証（未認証は 401）
    await requireAuthenticatedUser(request);

    // ② 設定チェック
    const config = readAiRuntimeConfig();
    if (!config) {
      throw new AiConfigurationError("AI is not configured.");
    }

    // ③ リクエスト検証（project + tasks + taskTitle）
    const body = parseDraftTaskRequest(await request.json());
    const truncatedTasks = body.tasks.slice(0, config.maxInputTasks);

    // ④ 草案生成用プロンプトで AI に問い合わせ
    const provider = createGeminiProvider(config);
    const prompt = buildTaskDraftPrompt(body.project, body.taskTitle, truncatedTasks);
    const output = await provider.generate({ prompt });

    // ⑤ AI 出力から description を抽出
    const data = parseDraftDescriptionFromModelOutput(output);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    if (error instanceof AiUnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AiConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof AiRequestError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to draft task." },
      { status: 400 },
    );
  }
}
