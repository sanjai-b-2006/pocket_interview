# Pocket Interview Coach — Build Spec (for Native.Builder)

## What this is
A live mock-interview practice web app. The user picks a target role, answers interview
questions out loud, and gets AI coaching on two axes: **content** (what they said — structure,
specificity) and **delivery** (how they said it — pace, tone/monotone, filler words, pauses).
Built for the AMD Developer Hackathon Act II, Unicorn Track. Must qualify for the
**Best Use of Gemma 4** bonus, so Gemma 4 must be the core reasoning engine for every piece of
generated text in the app (questions, feedback, report) — not a decorative add-on.

## Tech constraints (hackathon rules — do not violate)
- All model calls go through the **Fireworks AI API** using model `accounts/fireworks/models/gemma-4`
  (verify this exact model slug in the Fireworks model catalog before building — search "gemma" —
  and use whatever the real slug is instead if it differs).
- Fireworks API key is provided via Native.Builder's **Integrations** (Bring Your Own Key), funded by
  hackathon/ADP credits. No other API keys or paid services.
- Final submission must be **containerized** (Dockerfile / docker-compose) and pushed to a **public
  GitHub repo** with a README covering setup + usage. The app must be runnable from those
  instructions alone.
- No server-side custom ML models (no local Whisper/librosa install) — keep the whole pipeline to
  (a) Fireworks API calls and (b) browser-side JavaScript (Web Audio API). This keeps the app
  buildable and containerizable without heavyweight native ML dependencies.

## Core user flow
1. **Setup screen**: user enters a target role (free text) and optionally pastes a job description,
   picks number of questions (3 / 5 / 7). Submitting calls Gemma 4 to generate that many tailored
   interview questions (mix of behavioral + role-specific) and starts a session.
2. **Live session screen**: one question at a time.
   - User clicks "Record", speaks their answer into the mic, clicks "Stop".
   - The recorded audio is: (a) sent to Fireworks' hosted Whisper (or equivalent STT model) to get
     a transcript, and (b) analyzed **client-side in the browser** (see "Delivery metrics" below) to
     produce objective speech metrics — no audio ever needs to hit a custom backend model.
   - Transcript + metrics are sent to Gemma 4, which returns: content score (0-100), delivery score
     (0-100), content feedback (1-3 sentences), delivery feedback (1-3 sentences translating the raw
     metrics into plain coaching language).
   - Show both scores (animated circular progress rings), the metric chips (pace, filler count, pause
     %, tone variation), and both feedback blocks. User clicks "Next Question" (or "View Report" on
     the last one).
3. **Report screen**: after the last question, call Gemma 4 once more with all Q&A + scores to
   generate a session summary + top 3 improvement actions. Show: average content/delivery score
   rings, a line chart of content vs delivery score per question, the summary text, the top actions
   list, and full per-question detail (transcript + both feedback strings). Button to start a new
   session.

## Delivery metrics — compute these in browser JS (Web Audio API), not on a server
Given the recorded audio blob + its Whisper transcript with word-level timestamps (request
timestamped output from the STT call if the model supports it; otherwise estimate word boundaries
by evenly distributing across duration):

- **words_per_minute** = word_count / (duration_seconds / 60)
- **filler_word_count** = count of case-insensitive whole-word matches for:
  `um, umm, uh, uhh, like, actually, basically, literally` in the transcript
- **pause_ratio** = (sum of gaps between consecutive words where gap > 0.4s) / total_duration,
  clamped to [0, 1]
- **pitch_variation** (0 = monotone, 1 = highly expressive): run a pitch-detection pass on the audio
  (autocorrelation or the Web Audio `AnalyserNode` + a simple YIN/autocorrelation pitch tracker over
  ~30ms frames), compute the coefficient of variation (stddev / mean) of the voiced F0 values,
  normalize by dividing by 0.25 and clamp to [0, 1]
- **volume_consistency** (0 = erratic, 1 = very steady): compute RMS energy per frame (e.g. via
  `AnalyserNode.getByteFrequencyData` or manual RMS over small windows), take
  `1 - (stddev(rms) / mean(rms))`, clamp to [0, 1]

These five numbers plus the transcript are what get sent to Gemma 4 for the feedback call — Gemma
should never see raw audio, only these derived signals plus text.

## Gemma 4 prompts (use these near-verbatim for consistent quality)

**1. Question generation** — system prompt:
> You are an expert technical and behavioral interviewer. Respond ONLY with a JSON object:
> `{"questions": ["...", ...]}`.

user prompt:
> Generate {num_questions} realistic mock interview questions for the role: {role}.
> Job description context (may be empty): {job_description}
> Mix behavioral and role-specific technical questions.

**2. Per-answer feedback** — system prompt:
> You are a supportive but honest interview coach. You are given a candidate's transcribed answer
> plus objective speech-delivery measurements. Respond ONLY with a JSON object with keys:
> content_score (0-100 int), delivery_score (0-100 int), content_feedback (string, 1-3 sentences on
> structure/specificity/STAR method), delivery_feedback (string, 1-3 sentences translating the raw
> speech metrics into plain-English coaching about pace, tone/monotone, filler words, and pauses).

user prompt:
> Question: {question}
> Transcript: {transcript}
> Speech metrics: words_per_minute={wpm}, pitch_variation={pitch_variation} (0=monotone,
> 1=highly expressive), filler_word_count={filler_word_count}, pause_ratio={pause_ratio} (fraction
> of time silent), volume_consistency={volume_consistency} (1=very steady).

**3. End-of-session report** — system prompt:
> You are an interview coach writing a short end-of-session report. Respond ONLY with a JSON
> object: `{"summary": "2-4 sentence overview", "top_actions": ["action 1", "action 2", "action 3"]}`.

user prompt:
> Role: {role}
> Average content score: {avg_content}/100
> Average delivery score: {avg_delivery}/100
> Per-question detail:
> - Q: {question}\n  A: {transcript}\n  content_score={x} delivery_score={y}
> (repeated per question)
> Write an encouraging but candid summary and 3 concrete, prioritized next actions.

Always parse the model's response by extracting the first `{...}` JSON block (models sometimes wrap
JSON in prose) and validate all expected keys exist before using it; surface a clear error if not.

## UI requirements ("best of best" — this is judged on product feel)
- Dark theme, violet-to-cyan gradient accents, glassmorphic cards (translucent panels with blur),
  smooth page/element transitions (fade + slide on question change, animated circular score rings
  filling in on reveal).
- Setup screen: hero headline + subtext, role input with 2-3 quick-pick preset role chips
  (e.g. "Software Engineer", "Product Manager", "Data Analyst"), optional job-description textarea,
  question-count toggle, prominent gradient CTA button.
- Live session screen: progress dots across the top, current question in a large card, a live
  waveform/visualizer while recording, a timer, then after submission: two score rings
  (content/delivery), 4 metric chips (pace, fillers, pauses, tone variation), two feedback text
  blocks, and a next/finish button.
- Report screen: two average-score rings + written summary side by side, a line chart of
  content/delivery score across questions, a top-3-actions checklist, full per-question transcript +
  feedback breakdown, and a "start new interview" button.
- Fully responsive (mobile/tablet/desktop).

## Data model (whatever storage Native.Builder wires up — SQLite is enough)
- **Session**: id, role, job_description, created_at, status (active/completed)
- **Question**: id, session_id, order, text
- **Answer**: id, question_id, transcript, duration_sec, words_per_minute, pitch_variation,
  filler_word_count, pause_ratio, volume_consistency, content_score, delivery_score,
  content_feedback, delivery_feedback
- **Report**: id, session_id, summary, top_actions (list), avg_content_score, avg_delivery_score

## API surface needed
- `POST /sessions` — body: {role, job_description, num_questions} → creates session + questions
  (calls Gemma 4 question generation)
- `GET /sessions/{id}` — returns session + questions
- `POST /sessions/{id}/questions/{qid}/answer` — body: transcript + 5 delivery metrics (computed
  client-side) → calls Gemma 4 feedback, stores + returns the Answer
- `GET /sessions/{id}/report` — builds (if not already built) and returns the Report, aggregating
  all Answers for that session (calls Gemma 4 report synthesis)

## Submission checklist
- [ ] Public GitHub repo, README with setup + run instructions (this file can become that README —
      trim the build-spec framing, keep the product/architecture/prompt sections)
- [ ] Dockerfile(s) + docker-compose so the whole thing runs with one command
- [ ] Fireworks API key wired via env var / Native.Builder integration, never hardcoded
- [ ] Demo script: (1) start a 3-question session on a preset role, (2) answer one question
      naturally to show good scores, (3) answer one fast/monotone on purpose to show the delivery
      score drop and Gemma 4 calling it out specifically, (4) finish and show the report page
