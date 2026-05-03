import os
from threading import Lock
from typing import Any

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer


MODEL_ID = os.getenv("GEMMA_MODEL_ID", "google/gemma-4-E2B-it")
MODEL_PATH = os.getenv(
    "GEMMA_MODEL_PATH", r"C:\Users\mayum\AI_Hub\models\gemma-4-E2B-it"
)
HOST = os.getenv("GEMMA_HOST", "127.0.0.1")
PORT = int(os.getenv("GEMMA_PORT", "11434"))
DEFAULT_MAX_NEW_TOKENS = int(os.getenv("GEMMA_MAX_NEW_TOKENS", "512"))

app = FastAPI(title="Local Gemma API", version="0.1.0")

_model_lock = Lock()
_tokenizer = None
_model = None


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Prompt text")
    max_new_tokens: int = Field(
        default=DEFAULT_MAX_NEW_TOKENS, ge=1, le=2048, description="Max output tokens"
    )
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.95, ge=0.0, le=1.0)


class GenerateResponse(BaseModel):
    model: str
    output: str


def _resolve_model_source() -> str:
    if os.path.isdir(MODEL_PATH):
        return MODEL_PATH
    return MODEL_ID


def _load_model() -> tuple[Any, Any]:
    global _tokenizer, _model

    if _tokenizer is not None and _model is not None:
        return _tokenizer, _model

    with _model_lock:
        if _tokenizer is not None and _model is not None:
            return _tokenizer, _model

        model_source = _resolve_model_source()
        _tokenizer = AutoTokenizer.from_pretrained(model_source)
        _model = AutoModelForCausalLM.from_pretrained(
            model_source,
            torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
            device_map="cuda" if torch.cuda.is_available() else "cpu",
        )
    return _tokenizer, _model


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest) -> GenerateResponse:
    try:
        tokenizer, model = _load_model()
        inputs = tokenizer(req.prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            output_ids = model.generate(
                **inputs,
                max_new_tokens=req.max_new_tokens,
                temperature=req.temperature,
                top_p=req.top_p,
                do_sample=req.temperature > 0,
                pad_token_id=tokenizer.eos_token_id,
            )
        generated = tokenizer.decode(output_ids[0], skip_special_tokens=True)
        result = generated[len(req.prompt) :].strip() if generated.startswith(req.prompt) else generated.strip()
        return GenerateResponse(model=MODEL_ID, output=result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemma generation failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host=HOST, port=PORT, reload=False)
