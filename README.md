# Pocket Interview Coach

Live mock-interview practice with AI coaching on **what you said** (content) and **how you said it**
(pace, tone, filler words, pauses). Built for the AMD AI Developer Hackathon Act II — Unicorn Track.

## How it works

1. Enter a target role (and optionally a job description) → **Gemma 4** (via Fireworks AI) generates a
   tailored set of interview questions.
2. Answer each question out loud. Locally, the app transcribes your speech (`faster-whisper`) and
   extracts objective delivery metrics (`librosa`): words-per-minute, pitch variation, filler-word
   count, pause ratio, volume consistency.
3. The transcript + delivery metrics are sent to **Gemma 4**, which returns content feedback (STAR
   method, specificity) and delivery feedback in plain English, plus a content score and delivery
   score (0-100).
4. After the last question, Gemma 4 synthesizes an end-of-session report: overall summary, top 3
   improvement actions, and a score trend across the session.

This is a deliberately hybrid design: cheap, high-frequency work (speech-to-text, signal processing)
runs locally; the expensive reasoning/writing work is routed to Gemma 4 on Fireworks — only when it's
actually needed (once per answer, not continuously).

## Stack

- **Backend**: FastAPI, SQLite, `faster-whisper` (ASR), `librosa` (prosody/delivery features),
  Fireworks AI (Gemma 4) for content/delivery coaching and report synthesis.
- **Frontend**: Next.js (App Router) + Tailwind CSS + Framer Motion + Recharts.
- **Containerized**: `docker-compose.yml` builds and runs both services.

## Running locally

```bash
cp .env.example .env
# edit .env and set FIREWORKS_API_KEY

docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (docs at /docs)

## AMD Developer Cloud / ROCm upgrade path

The ASR service (`backend/app/services/asr.py`) runs on CPU by default (`ASR_DEVICE=cpu` in `.env`).
Once ROCm-enabled PyTorch/CTranslate2 is available on an AMD Developer Cloud GPU instance, switch to
GPU-accelerated transcription with **no code changes**:

```bash
ASR_DEVICE=cuda
```

(`faster-whisper`/CTranslate2 uses the CUDA device string for any GPU backend, including ROCm's
HIP/CUDA compatibility layer.) Swap the backend's base image to an AMD ROCm-enabled Python image when
deploying to AMD Developer Cloud.

## Demo script (for judges)

1. Land on the homepage, pick a preset role (e.g. "Software Engineer"), start a 3-question session.
2. Answer one question **naturally** — show a good content + delivery score.
3. Answer another question **fast and monotone on purpose** — show the delivery score drop and Gemma 4
   calling it out specifically ("you sped up," "sounded monotone").
4. Finish the session → show the report page: score trend chart, Gemma 4 summary, top 3 actions.
