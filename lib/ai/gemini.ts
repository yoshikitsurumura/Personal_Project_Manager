// @author Claude
// =============================================================================
// Gemini プロバイダ実装
// provider.ts の AiProvider インターフェースを Google AI Studio (Gemini API) 向けに実装する。
//
// 仕組み:
//   Next.js (Route Handler)
//     → この gemini.ts が Google AI Studio API に HTTPS リクエストを送る
//       → Gemini モデルが推論を実行して返す
//
// 学習ポイント:
//   「ファクトリ関数パターン」を使っている。
//   createGeminiProvider(config) を呼ぶと AiProvider オブジェクトが返る。
//   config（API キーやモデル名）をクロージャでキャプチャするので、
//   generate() を呼ぶ側は接続先を知らなくてよい。
// =============================================================================

import { AiConfigurationError, AiRequestError } from "@/lib/ai/errors";
import type { AiProvider } from "@/lib/ai/provider";
import type { AiRuntimeConfig } from "@/lib/ai/runtime-config";

/**
 * Gemini API のレスポンス型。
 */
type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

/**
 * AiRuntimeConfig を受け取り、Gemini 用の AiProvider を生成するファクトリ関数。
 *
 * @param config - runtime-config.ts から読み取った AI 設定
 * @returns AiProvider - generate メソッドを持つオブジェクト
 * @throws AiConfigurationError - provider が "gemini" でない場合
 */
export function createGeminiProvider(config: AiRuntimeConfig): AiProvider {
  if (config.provider !== "gemini") {
    throw new AiConfigurationError("Only gemini provider is supported.");
  }

  return {
    async generate(input) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

      try {
        // API キーは URL クエリではなく x-goog-api-key ヘッダで渡す。
        // クエリに含めると中継プロキシや Next.js のアクセスログに残るため避ける。
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": config.geminiApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: input.prompt }],
              },
            ],
            generationConfig: {
              temperature: input.temperature ?? 0.4,
              maxOutputTokens: input.maxNewTokens ?? 500,
              topP: input.topP ?? 0.95,
              // プロンプトで指定した JSON をそのまま返させ、Markdown コードフェンスでの装飾を抑制する
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          throw new AiRequestError(
            `Gemini API returned ${response.status}: ${errorBody}`
          );
        }

        const data = (await response.json()) as GeminiResponse;

        if (data.error) {
          throw new AiRequestError(
            `Gemini API error: ${data.error.message ?? "Unknown error"}`
          );
        }

        const output = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!output) {
          throw new AiRequestError("Gemini API returned empty output.");
        }

        return output;
      } catch (error) {
        if (error instanceof AiRequestError) {
          throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
          throw new AiRequestError("Gemini API request timed out.");
        }
        throw new AiRequestError(
          error instanceof Error ? error.message : "Unknown Gemini API error."
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
