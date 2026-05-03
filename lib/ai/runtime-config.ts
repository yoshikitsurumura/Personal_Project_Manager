// @author Claude
// =============================================================================
// AI 設定の読み込み（サーバー専用）
// firebase/runtime-config.ts と同じ思想で、環境変数から AI プロバイダの設定を読む。
// 必要な値が揃っていなければ null を返し、AI 機能を「未設定」状態にする。
//
// 学習ポイント:
//   このファイルは Server Component / Route Handler からのみ呼ぶ。
//   process.env はサーバー側限定なので、クライアントには
//   「設定済みかどうか（boolean）」だけを providers.tsx 経由で渡す。
//   接続先 URL や API キーがクライアントに漏れない設計。
// =============================================================================

/**
 * AI 機能の実行時設定の型定義。
 */
export type AiRuntimeConfig = {
  provider: "gemini";         // どの AI バックエンドを使うか
  geminiModel: string;        // モデル識別子（例: gemini-2.0-flash）
  geminiApiKey: string;       // Google AI Studio の API キー
  requestTimeoutMs: number;   // AI 呼び出しのタイムアウト（ミリ秒）
  maxInputTasks: number;      // プロンプトに含めるタスクの上限件数
};

/**
 * 環境変数 1 つを読んで前後の空白を除去して返す。
 * 未定義なら空文字列を返す。
 */
function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

/**
 * 文字列を正の整数としてパースする。
 * 不正な値の場合は fallback を返す。
 */
function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * 環境変数から AI 設定を読み取って返す。
 * AI_PROVIDER / GEMINI_API_KEY / GEMINI_MODEL のいずれかが欠けていれば
 * null を返し、アプリ側の AI 機能を無効化する。
 *
 * @returns AiRuntimeConfig - 全項目が揃っている場合
 * @returns null            - 必須環境変数が不足している場合
 */
export function readAiRuntimeConfig(): AiRuntimeConfig | null {
  const provider = readEnv("AI_PROVIDER");
  const geminiModel = readEnv("GEMINI_MODEL");
  const geminiApiKey = readEnv("GEMINI_API_KEY");
  const requestTimeoutMs = parsePositiveInt(readEnv("AI_REQUEST_TIMEOUT_MS"), 30000);
  const maxInputTasks = parsePositiveInt(readEnv("AI_MAX_INPUT_TASKS"), 100);

  // 必須項目が揃っていなければ AI 無効
  if (provider !== "gemini" || !geminiApiKey || !geminiModel) {
    return null;
  }

  return {
    provider: "gemini",
    geminiModel,
    geminiApiKey,
    requestTimeoutMs,
    maxInputTasks,
  };
}
