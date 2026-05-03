// @author Claude
// =============================================================================
// 次アクション提案 API
// POST /api/ai/suggest-next-actions
//
// プロジェクト情報とタスク一覧から、優先度の高い次のアクションを
// 最大 3 件提案して返す。
//
// データフロー:
//   クライアント → この Route Handler → Gemini API
//   → schemas.ts の parseActionsFromModelOutput でパース
//   → { actions: ["...", "...", "..."] } を返す
//
// 学習ポイント:
//   summarize-project と構造がほぼ同じ。
//   違いは「使うプロンプト」と「出力パーサー」だけ。
//   このパターン統一が AI Provider 抽象（provider.ts）の設計意図。
// =============================================================================

import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/ai/auth";
import {
  AiConfigurationError,
  AiRequestError,
  AiUnauthorizedError,
} from "@/lib/ai/errors";
import { createGeminiProvider } from "@/lib/ai/gemini";
import { buildNextActionsPrompt } from "@/lib/ai/prompts";
import {
  parseActionsFromModelOutput,
  parseSuggestNextActionsRequest,
} from "@/lib/ai/schemas";
import { readAiRuntimeConfig } from "@/lib/ai/runtime-config";

/**
 * POST /api/ai/suggest-next-actions
 *
 * @param request - { project: { id, name, description }, tasks: [...] }
 * @returns 200: { actions: string[] } - 最大 3 件の提案
 * @returns 400/502/503: { error: string }
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

    // ③ リクエスト検証（summarize と同じ構造のパーサーを再利用）
    const body = parseSuggestNextActionsRequest(await request.json());
    const truncatedTasks = body.tasks.slice(0, config.maxInputTasks);

    // ④ 「次アクション提案」専用のプロンプトで AI に問い合わせ
    const provider = createGeminiProvider(config);
    const prompt = buildNextActionsPrompt(body.project, truncatedTasks);
    const output = await provider.generate({ prompt });

    // ⑤ AI 出力を actions 配列にパース（JSON 失敗時は行分割でフォールバック）
    const data = parseActionsFromModelOutput(output);

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
      { error: error instanceof Error ? error.message : "Failed to suggest next actions." },
      { status: 400 },
    );
  }
}
