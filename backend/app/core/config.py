from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    fireworks_api_key: str = ""
    fireworks_base_url: str = "https://api.fireworks.ai/inference/v1"
    gemma_model: str = "accounts/fireworks/models/gemma-4"

    asr_device: str = "cpu"  # "cpu" now, "cuda" once ROCm-enabled torch is available on AMD Developer Cloud
    asr_model_size: str = "base"
    asr_compute_type: str = "int8"
    enable_pitch_analysis: bool = True  # set false on memory-constrained hosts (skips numba-JIT pyin pass)

    database_url: str = "sqlite:///./interview_coach.db"

    cors_origins: str = "http://localhost:3000"  # comma-separated list of allowed frontend origins

    class Config:
        env_file = ".env"


settings = Settings()
