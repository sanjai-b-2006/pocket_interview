# Pocket Interview Coach

Live mock-interview practice with AI coaching on **what you said** (content) and **how you said it**
(pace, tone, filler words, pauses, confidence). Built for the AMD AI Developer Hackathon Act II —
Unicorn Track, targeting the Best Use of Gemma 4 bonus.

## Table of contents

- [What it does](#what-it-does)
- [Full user workflow](#full-user-workflow)
- [Feature list](#feature-list)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [AMD Developer Cloud / ROCm upgrade path](#amd-developer-cloud--rocm-upgrade-path)
- [Known limitations](#known-limitations)
- [Demo script](#demo-script-for-judges)

## What it does

You describe the role you're interviewing for, optionally attach a resume and a job description, and
the app builds a tailored mock interview. You answer each question out loud; the app scores both
**content** (what you said) and **delivery** (how you said it) and explains why, in plain English.
At the end you get a full report: a score trend across the session, a written summary, and concrete
next actions.

The whole pipeline is a deliberately **hybrid** design: cheap, high-frequency work (speech-to-text,
audio signal processing) runs **locally**, and the expensive reasoning/writing work is routed to
**Gemma 4** — only when it's actually needed (once per answer, not continuously).

## Full user workflow

1. **Setup screen** (`/`)
   - Enter a target **role** (or pick a preset: Software Engineer / Product Manager / Data Analyst).
   - Optionally enter a **company** name — every session gets at least one guaranteed basic warm-up
     question (see below), and if a company is given, questions/sample answers reference it by name.
   - Optionally paste a **job description** for more tailored questions.
   - Optionally attach a **resume** (PDF or plain text) — if attached, at least one question will
     ask about a specific project or piece of experience pulled directly from it.
   - Pick an **experience level** (Entry / Mid / Senior / Staff-Lead) — question difficulty and depth
     is calibrated to this.
   - Pick the **number of questions** (1–10) via a slider.
   - Choose when to see **sample answers**: after each question, only at the end, or never.
   - Optionally enable an **answer timer** with a duration (30–300s) — recording auto-stops at zero.
   - Submitting calls Gemma 4 once to generate the full question set (see
     [question generation](#question-generation-details) below) and starts the session.

2. **Live session screen** (`/session/[id]`)
   - One question at a time, with a progress-dot bar across the top.
   - Click **Record**, answer out loud (live waveform visualizer + timer/countdown), click **Stop**.
   - Review the recording; **re-record** or **Submit Answer**.
   - On submit: the audio is transcribed locally (`faster-whisper`), delivery metrics are computed
     locally (`librosa`), and both are sent to Gemma 4 for scoring. You get back:
     - Content score and delivery score (0–100, shown as animated rings)
     - Metric chips: pace (WPM), filler-word count, pause %, tone variation
     - Written content feedback (structure/specificity/STAR method) and delivery feedback (pace,
       monotone/expressive, filler words, pauses) in plain English
     - The sample answer, if you chose "after each question"
   - Move to the next question, or finish to see the report.

3. **Report screen** (`/session/[id]/report`)
   - Average content/delivery scores as rings, plus a written session summary.
   - A line chart of content vs. delivery score across every question.
   - Top 3 prioritized improvement actions.
   - Full per-question breakdown: the question, your transcript, both feedback strings, and the
     sample answer (if you chose "at the end").
   - Start a new interview.

4. **Settings screen** (`/settings`, gear icon in the header)
   - Bring your own LLM API key, base URL, and model — every request will use your key/model instead
     of the app's default, without needing a rebuild or restart. Useful for running the app on your
     own Fireworks/OpenRouter credits, or pointing it at a different provider entirely.

## Feature list

- Role + company + job description + resume + experience-level-aware question generation
- Guaranteed basic warm-up question every session, drawn from a 27-question pool of the most common
  real interview questions ("Tell me about yourself," strengths/weaknesses, "why this company,"
  greatest achievement, five-year plan, salary expectations, etc.) — never left purely to LLM
  discretion, so it's deterministic
- Resume-aware project questions (PDF or plain text upload, optional)
- Questions explicitly ordered **easy → hard**, with domain-specific framing for the role's actual
  industry (e.g. a manufacturing role gets quality-control/recall-flavored questions, not generic
  software questions)
- Per-question **sample/ideal answers**, shown after each answer, at the end, or never (your choice)
- Live mic recording with waveform visualization
- Optional **answer timer** with auto-stop
- Objective delivery metrics computed locally: words-per-minute, pitch variation (monotone vs.
  expressive), filler-word count, pause ratio, volume consistency
- Content **and** delivery scoring (0–100) with written, plain-English feedback for both
- End-of-session report: score trend chart, written summary, top-3 action items, full per-question
  detail
- **Bring-your-own-key** settings page — override the server's API key/base URL/model per browser,
  via request headers, with zero backend redeploy
- Fully containerized (Docker Compose, one command to run both services)

### Question generation details

A single Gemma 4 call per session does all of this at once:
- The first question is **fixed** by the app (randomly chosen from the 27-question basic pool,
  formatted with the company name if given) — Gemma only writes its sample answer.
- If a resume was attached, Gemma is instructed to include at least one question about a specific
  project/experience from it.
- The remaining questions mix behavioral and role-specific technical questions, tailored to the
  role's actual industry, and are explicitly ordered from easiest to hardest.
- Every question gets its own concise, strong sample answer, generated in the same call.

## Architecture

```
pocket-interview-coach/
  frontend/                     Next.js (App Router) + Tailwind + Framer Motion + Recharts
    src/app/page.tsx             Setup screen
    src/app/session/[id]/        Live session screen
    src/app/session/[id]/report/ Report screen
    src/app/settings/            BYOK settings screen
    src/components/              Recorder (mic + waveform + timer), Header, shared UI primitives
    src/lib/api.ts                Typed fetch client (attaches BYOK headers automatically)
    src/lib/settings.ts           localStorage-backed user settings (BYOK key, timer, sample-answer mode)

  backend/                      FastAPI
    app/routers/
      session.py                 POST /sessions (multipart: role, company, job_description,
                                  experience_level, num_questions, resume file)
      answer.py                  POST /sessions/{id}/questions/{qid}/answer (multipart: audio)
      report.py                  GET /sessions/{id}/report
      llm_override.py            Reads X-Llm-* headers into a per-request LLMOverride
    app/services/
      asr.py                     faster-whisper wrapper (CPU now, ROCm-ready via env var)
      prosody.py                 librosa-based delivery-metric extraction
      resume.py                  PDF/text resume extraction (pypdf)
      llm.py                     Gemma 4 client (question gen, per-answer feedback, report synthesis)
      interview.py                Orchestrates the above into session/answer/report flows
    app/models/
      db.py                      SQLAlchemy models (SQLite)
      schemas.py                  Pydantic response models

  docker-compose.yml             Builds and runs both services together
```

- **Local (runs on CPU today, AMD GPU/ROCm later)**: speech-to-text and prosody/delivery-metric
  extraction. Cheap, runs per-answer, zero API cost.
- **Remote (Gemma 4 via Fireworks AI or OpenRouter)**: all reasoning and writing — question
  generation, per-answer coaching, report synthesis. This is the entire "Best Use of Gemma 4" case.
- **Storage**: SQLite (sessions, questions, answers, reports) — no separate database service needed.

## Tech stack

- **Backend**: FastAPI, SQLAlchemy + SQLite, `faster-whisper` (ASR), `librosa` (prosody), `pypdf`
  (resume text extraction), `httpx` (LLM API calls)
- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, Recharts, lucide-react icons
- **LLM**: Gemma 4, accessed via an OpenAI-compatible chat-completions endpoint (Fireworks AI or
  OpenRouter — configurable, and overridable per-request via the Settings page)
- **Containerized**: Docker Compose, one command to build and run both services

## Running locally

```bash
cp .env.example .env
# edit .env: set FIREWORKS_API_KEY (or point FIREWORKS_BASE_URL/GEMMA_MODEL at OpenRouter — see below)

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API + docs: http://localhost:8000/docs

## Environment variables

See `.env.example` for the full list. The important ones:

| Variable | Purpose |
|---|---|
| `FIREWORKS_API_KEY` | Server-default LLM API key (used unless a client overrides via Settings) |
| `FIREWORKS_BASE_URL` | OpenAI-compatible base URL — `https://api.fireworks.ai/inference/v1` or `https://openrouter.ai/api/v1` |
| `GEMMA_MODEL` | Exact model slug for your provider (e.g. `accounts/fireworks/models/gemma-4-26b-a4b-it` on Fireworks, or `google/gemma-4-26b-a4b-it` on OpenRouter) |
| `ASR_DEVICE` | `cpu` today; set to `cuda` once running on an AMD Developer Cloud GPU with ROCm-enabled torch/ctranslate2 |
| `ASR_MODEL_SIZE` | faster-whisper model size (`base` by default; larger = more accurate, slower) |
| `DATABASE_URL` | SQLite connection string |
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL the frontend calls (browser-side, baked in at build time) |

Any client can also override the API key/base URL/model **per request** without touching `.env`, via
the Settings page in the app (sends `X-Llm-Api-Key`, `X-Llm-Base-Url`, `X-Llm-Model` headers).

## API reference

| Method | Path | Body | Purpose |
|---|---|---|---|
| `POST` | `/sessions` | multipart form: `role`, `company`, `job_description`, `experience_level`, `num_questions`, `resume` (file, optional) | Creates a session + generates all questions via Gemma 4 |
| `GET` | `/sessions/{id}` | — | Fetches a session and its questions |
| `POST` | `/sessions/{id}/questions/{qid}/answer` | multipart form: `audio` (file) | Transcribes, scores, and returns feedback for one answer |
| `GET` | `/sessions/{id}/report` | — | Builds (once) and returns the end-of-session report |
| `GET` | `/health` | — | Liveness check |

All endpoints accept the optional `X-Llm-Api-Key` / `X-Llm-Base-Url` / `X-Llm-Model` headers to
override the server's default LLM config for that request.

## AMD Developer Cloud / ROCm upgrade path

`ASR_DEVICE` controls faster-whisper's device (`cpu` today → `cuda` once ROCm-enabled
torch/ctranslate2 is available on an AMD Developer Cloud GPU instance) — **no code changes needed**,
just the env var and a ROCm-enabled base image swap in `backend/Dockerfile`.
(`faster-whisper`/CTranslate2 uses the CUDA device string for any GPU backend, including ROCm's
HIP/CUDA compatibility layer.)

## Known limitations

- **Latency**: each answer runs ASR → prosody extraction → an LLM call, sequentially. Pitch tracking
  (`librosa.pyin`) is the slowest single step; CPU-based Whisper is the second-largest contributor.
  Both are expected to get significantly faster once ASR moves to an AMD GPU.
- **Transcription accuracy**: uses Whisper's `base` model for speed; larger models trade latency for
  accuracy.
- **Delivery-metric calibration**: pitch-variation and volume-consistency normalization constants are
  reasonable heuristics, not calibrated against a labeled dataset of real interview audio.
- **Scoring consistency**: content/delivery scores come from an LLM judging a transcript plus a
  handful of numbers — expect some run-to-run variance, not a validated psychometric instrument.

## Demo script (for judges)

1. Land on the homepage, pick a preset role, optionally attach a resume, pick "Senior" experience
   level, start a 4-question session.
2. Answer the first (guaranteed basic) question naturally — show a solid content + delivery score.
3. Answer a resume-based question — show the feedback referencing your actual project.
4. Answer another question **fast and monotone on purpose** — show the delivery score drop and
   Gemma 4 calling it out specifically ("you sped up," "sounded monotone").
5. Finish the session → show the report page: score trend chart, Gemma 4 summary, top 3 actions,
   full per-question detail with sample answers.
6. Open Settings → show the BYOK override working live.
