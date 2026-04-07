export type AiGenerateInput = {
  prompt: string;
  temperature?: number;
  maxNewTokens?: number;
  topP?: number;
};

export type AiProvider = {
  generate(input: AiGenerateInput): Promise<string>;
};
