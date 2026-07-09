from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.models.db import init_db
from app.routers import answer, report, session
from app.services.llm import GemmaAPIError

app = FastAPI(title="Pocket Interview Coach API")


@app.exception_handler(GemmaAPIError)
def gemma_api_error_handler(request: Request, exc: GemmaAPIError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": f"Gemma 4 request failed: {exc}"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router)
app.include_router(answer.router)
app.include_router(report.router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
