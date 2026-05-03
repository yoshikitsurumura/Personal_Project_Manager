// @author Claude
// =============================================================================
// プロジェクト要約 API
// POST /api/ai/summarize-project
//
// クライアントからプロジェクト情報とタスク一覧を受け取り、
// Gemini でプロジェクトの現状を日本語で要約して返す。
//
// データフロー:
//   クライアント (project-detail-screen.tsx)
//     → この Route Handler
//       → schemas.ts でリクエスト検証
//       → prompts.ts でプロンプト組み立て
//       → gemini.ts で Gemini API に送信
//       → schemas.ts で AI 出力をパース
//     → クライアントに { summary: "..." } を返す
//
// 学習ポイント:
//   Next.js App Router の Route Handler は HTTP メソッド名を
//   そのまま関数名にしてエクスポートする。
//   ここでは POST メソッドのみを処理する。
// =============================================================================

import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/ai/auth";
import {
  AiConfigurationError,
  AiRequestError,
  AiUnauthorizedError,
} from "@/lib/ai/errors";
import { createGeminiProvider } from "@/lib/ai/gemini";
import { buildProjectSummaryPrompt } from "@/lib/ai/prompts";
import {
  parseSummarizeProjectRequest,
  parseSummaryFromModelOutput,
} from "@/lib/ai/schemas";
import { readAiRuntimeConfig } from "@/lib/ai/runtime-config";

/**
 * POST /api/ai/summarize-project
 *
 * @param request - { project: { id, name, description }, tasks: [...] }
 * @returns 200: { summary: string }
 * @returns 400: { error: string }  - リクエスト不正
 * @returns 502: { error: string }  - AI バックエンドエラー
 * @returns 503: { error: string }  - AI 未設定
 *
 * 学習ポイント:
 *   try/catch で errors.ts のカスタムエラークラスを instanceof で分岐し、
 *   エラーの種類に応じた HTTP ステータスコードを返している。
 *     AiConfigurationError → 503（Service Unavailable）
 *     AiRequestError       → 502（Bad Gateway: 上流サーバーのエラー）
 *     その他               → 400（Bad Request: クライアント側の問題）
 */
export async function POST(request: Request) {
  try {
    // ① クライアントの Firebase ID Token を検証（未認証は 401）
    await requireAuthenticatedUser(request);

    // ② AI 設定を読み取る（環境変数未設定なら null → エラー）
    const config = readAiRuntimeConfig();
    if (!config) {
      throw new AiConfigurationError("AI is not configured.");
    }

    // ③ リクエストボディをパース・検証する
    const body = parseSummarizeProjectRequest(await request.json());

    // ④ タスク数が多すぎる場合は上限で切り詰める（トークン節約）
    const truncatedTasks = body.tasks.slice(0, config.maxInputTasks);

    // ⑤ Gemini プロバイダを生成
    const provider = createGeminiProvider(config);

    // ⑥ プロンプトを組み立てて AI に送る
    const prompt = buildProjectSummaryPrompt(body.project, truncatedTasks);
    const output = await provider.generate({ prompt });

    // ⑦ AI の生テキストから { summary } を抽出して返す
    const data = parseSummaryFromModelOutput(output);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    // エラーの種類に応じて HTTP ステータスを分ける
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
      { error: error instanceof Error ? error.message : "Failed to summarize project." },
      { status: 400 },
    );
  }
}
