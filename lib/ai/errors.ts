export class AiConfigurationError extends Error {
  constructor(message = "AI configuration is missing or invalid.") {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class AiRequestError extends Error {
  constructor(message = "AI request failed.") {
    super(message);
    this.name = "AiRequestError";
  }
}
