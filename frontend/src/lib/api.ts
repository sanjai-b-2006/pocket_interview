import { llmHeaders } from "@/lib/settings";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface Question {
  id: string;
  order: number;
  text: string;
  sample_answer: string;
  persona: string;
  is_dynamic: boolean;
}

export interface SessionResponse {
  session_id: string;
  role: string;
  company: string;
  session_type: string;
  persona: string;
  panel_mode: boolean;
  drill_focus: string;
  questions: Question[];
}

export interface TimelinePoint {
  t: number;
  words_per_minute: number;
  pitch_variation: number;
}

export interface AnswerFeedback {
  question: string;
  sample_answer: string;
  persona: string;
  transcript: string;
  duration_sec: number;
  words_per_minute: number;
  pitch_variation: number;
  filler_word_count: number;
  pause_ratio: number;
  volume_consistency: number;
  delivery_timeline: TimelinePoint[];
  content_score: number;
  delivery_score: number;
  content_feedback: string;
  delivery_feedback: string;
  follow_up_question: Question | null;
}

export interface ReportResponse {
  session_id: string;
  role: string;
  company: string;
  experience_level: string;
  summary: string;
  top_actions: string[];
  avg_content_score: number;
  avg_delivery_score: number;
  answers: AnswerFeedback[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface CreateSessionOptions {
  role: string;
  company: string;
  jobDescription: string;
  numQuestions: number;
  experienceLevel: string;
  resumeFile: File | null;
  sessionType?: string;
  persona?: string;
  panelMode?: boolean;
  drillFocus?: string;
}

export async function createSession(opts: CreateSessionOptions): Promise<SessionResponse> {
  const form = new FormData();
  form.append("role", opts.role);
  form.append("company", opts.company);
  form.append("job_description", opts.jobDescription);
  form.append("num_questions", String(opts.numQuestions));
  form.append("experience_level", opts.experienceLevel);
  form.append("session_type", opts.sessionType || "job_interview");
  form.append("persona", opts.persona || "");
  form.append("panel_mode", String(opts.panelMode || false));
  form.append("drill_focus", opts.drillFocus || "");
  if (opts.resumeFile) form.append("resume", opts.resumeFile);

  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: llmHeaders(),
    body: form,
  });
  return handle<SessionResponse>(res);
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  return handle<SessionResponse>(res);
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  audioBlob: Blob
): Promise<AnswerFeedback> {
  const form = new FormData();
  form.append("audio", audioBlob, "answer.webm");
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/questions/${questionId}/answer`, {
    method: "POST",
    headers: llmHeaders(),
    body: form,
  });
  return handle<AnswerFeedback>(res);
}

export async function getReport(sessionId: string): Promise<ReportResponse> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/report`, {
    headers: llmHeaders(),
  });
  return handle<ReportResponse>(res);
}

export async function getCheatSheet(sessionId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/report/cheatsheet`, {
    headers: llmHeaders(),
  });
  const data = await handle<{ cheat_sheet: string }>(res);
  return data.cheat_sheet;
}
