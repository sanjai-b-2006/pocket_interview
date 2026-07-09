from typing import Optional

from fastapi import Header

from app.services.llm import LLMOverride


def get_llm_override(
    x_llm_api_key: Optional[str] = Header(default=None),
    x_llm_base_url: Optional[str] = Header(default=None),
    x_llm_model: Optional[str] = Header(default=None),
) -> LLMOverride:
    """Lets a client bring its own API key/base URL/model via headers, overriding the
    server's default (.env) Fireworks/OpenRouter config for that request only."""
    return LLMOverride(api_key=x_llm_api_key, base_url=x_llm_base_url, model=x_llm_model)
