import { NextResponse } from "next/server";

import { AiConfigurationError, AiRequestError } from "@/lib/ai/errors";
import { createGemmaProvider } from "@/lib/ai/gemma";
import { buildNextActionsPrompt } from "@/lib/ai/prompts";
import {
  parseActionsFromModelOutput,
  parseSuggestNextActionsRequest,
} from "@/lib/ai/schemas";
import { readAiRuntimeConfig } from "@/lib/ai/runtime-config";

export async function POST(request: Request) {
  try {
    const config = readAiRuntimeConfig();
    if (!config) {
      throw new AiConfigurationError("AI is not configured.");
    }

    const body = parseSuggestNextActionsRequest(await request.json());
    const truncatedTasks = body.tasks.slice(0, config.maxInputTasks);
    const provider = createGemmaProvider(config);
    const prompt = buildNextActionsPrompt(body.project, truncatedTasks);
    const output = await provider.generate({ prompt });
    const data = parseActionsFromModelOutput(output);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
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
