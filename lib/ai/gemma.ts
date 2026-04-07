import { AiConfigurationError, AiRequestError } from "@/lib/ai/errors";
import type { AiProvider } from "@/lib/ai/provider";
import type { AiRuntimeConfig } from "@/lib/ai/runtime-config";

type GemmaGenerateResponse = {
  output?: string;
};

export function createGemmaProvider(config: AiRuntimeConfig): AiProvider {
  if (config.provider !== "gemma") {
    throw new AiConfigurationError("Only gemma provider is supported.");
  }

  return {
    async generate(input) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

      try {
        const response = await fetch(`${config.gemmaBaseUrl}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.gemmaApiKey ? { Authorization: `Bearer ${config.gemmaApiKey}` } : {}),
          },
          body: JSON.stringify({
            prompt: input.prompt,
            temperature: input.temperature ?? 0.4,
            max_new_tokens: input.maxNewTokens ?? 500,
            top_p: input.topP ?? 0.95,
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new AiRequestError(`Gemma API returned ${response.status}.`);
        }

        const data = (await response.json()) as GemmaGenerateResponse;
        const output = data.output?.trim();
        if (!output) {
          throw new AiRequestError("Gemma API returned empty output.");
        }

        return output;
      } catch (error) {
        if (error instanceof AiRequestError) {
          throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
          throw new AiRequestError("Gemma API request timed out.");
        }
        throw new AiRequestError(error instanceof Error ? error.message : "Unknown Gemma API error.");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
