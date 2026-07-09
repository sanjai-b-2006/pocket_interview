import { llmHeaders } from "@/lib/settings";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface Question {
  id: string;
  order: number;
  text: string;
  sample_answer: string;
}

export interface SessionResponse {
  session_id: string;
  role: string;
  company: string;
  questions: Question[];
}

export interface AnswerFeedback {
  question: string;
  sample_answer: string;
  transcript: string;
  duration_sec: number;
  words_per_minute: number;
  pitch_variation: number;
  filler_word_count: number;
  pause_ratio: number;
  volume_consistency: number;
  content_score: number;
  delivery_score: number;
  content_feedback: string;
  delivery_feedback: string;
}

export interface ReportResponse {
  session_id: string;
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

export async function createSession(
  role: string,
  company: string,
  jobDescription: string,
  numQuestions: number,
  experienceLevel: string,
  resumeFile: File | null
): Promise<SessionResponse> {
  const form = new FormData();
  form.append("role", role);
  form.append("company", company);
  form.append("job_description", jobDescription);
  form.append("num_questions", String(numQuestions));
  form.append("experience_level", experienceLevel);
  if (resumeFile) form.append("resume", resumeFile);

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
