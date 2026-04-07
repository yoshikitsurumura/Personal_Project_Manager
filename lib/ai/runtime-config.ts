export type AiRuntimeConfig = {
  provider: "gemma";
  gemmaBaseUrl: string;
  gemmaModel: string;
  gemmaApiKey: string;
  requestTimeoutMs: number;
  maxInputTasks: number;
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readAiRuntimeConfig(): AiRuntimeConfig | null {
  const provider = readEnv("AI_PROVIDER");
  const gemmaBaseUrl = readEnv("GEMMA_BASE_URL");
  const gemmaModel = readEnv("GEMMA_MODEL");
  const gemmaApiKey = readEnv("GEMMA_API_KEY");
  const requestTimeoutMs = parsePositiveInt(readEnv("AI_REQUEST_TIMEOUT_MS"), 30000);
  const maxInputTasks = parsePositiveInt(readEnv("AI_MAX_INPUT_TASKS"), 100);

  if (provider !== "gemma" || !gemmaBaseUrl || !gemmaModel) {
    return null;
  }

  return {
    provider: "gemma",
    gemmaBaseUrl,
    gemmaModel,
    gemmaApiKey,
    requestTimeoutMs,
    maxInputTasks,
  };
}
