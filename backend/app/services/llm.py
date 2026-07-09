import json
import random
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

BASIC_QUESTIONS = [
    "Tell me about yourself.",
    "What do you know about {company}, and why do you want to work here?",
    "Walk me through your resume.",
    "Why are you interested in this role?",
    "What makes you a good fit for this position?",
    "What are your thoughts on {company} and what we do?",
    "Why do you want to leave your current job?",
    "What would you say are your greatest strengths?",
    "What do you consider your biggest weakness?",
    "Where do you see yourself in five years?",
    "Why should we hire you over other candidates?",
    "What motivates you to do your best work?",
    "Describe your ideal work environment.",
    "How do you handle stress or working under pressure?",
    "What would you consider your greatest professional achievement?",
    "What are your salary expectations for this role?",
    "Why did you choose this career path?",
    "How would your previous manager or teammates describe you?",
    "Do you prefer working independently or as part of a team?",
    "How do you prioritize tasks when you have multiple deadlines?",
    "What's a significant challenge you've faced, and how did you overcome it?",
    "How do you respond to feedback or criticism?",
    "What are you looking for in your next role?",
    "Why did you decide to apply to {company}?",
    "What do you know about our industry and main competitors?",
    "What's something you're passionate about outside of work?",
    "How do you stay current in your field?",
]


class GemmaAPIError(Exception):
    """Raised when the LLM call fails or returns an unusable response."""


@dataclass
class LLMOverride:
    """Per-request bring-your-own-key override. Any unset field falls back to server defaults."""

    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


def _extract_json(text: str) -> Dict[str, Any]:
    """Gemma sometimes wraps JSON in prose or code fences; pull the first {...} block out."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise GemmaAPIError(f"No JSON object found in model response: {text!r}")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise GemmaAPIError(f"Model response was not valid JSON: {exc}") from exc


class GemmaClient:
    def _chat(self, system: str, user: str, override: Optional[LLMOverride] = None) -> str:
        api_key = (override and override.api_key) or settings.fireworks_api_key
        base_url = (override and override.base_url) or settings.fireworks_base_url
        model = (override and override.model) or settings.gemma_model

        try:
            resp = httpx.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.4,
                    "max_tokens": 1000,
                },
                timeout=60.0,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise GemmaAPIError(
                f"LLM API returned {exc.response.status_code}: {exc.response.text[:300]}"
            ) from exc
        except httpx.RequestError as exc:
            raise GemmaAPIError(f"Could not reach LLM API: {exc}") from exc

        try:
            return resp.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, ValueError) as exc:
            raise GemmaAPIError(f"Unexpected LLM response shape: {exc}") from exc

    def generate_questions(
        self,
        role: str,
        job_description: str,
        num_questions: int,
        company: str = "",
        experience_level: str = "",
        resume_text: str = "",
        override: Optional[LLMOverride] = None,
    ) -> List[Dict[str, str]]:
        basic_question = random.choice(BASIC_QUESTIONS).format(company=company or "the company")
        remaining = max(num_questions - 1, 0)

        system = (
            "You are an expert technical and behavioral interviewer. Respond ONLY with a JSON "
            "object: {\"questions\": [{\"text\": \"...\", \"sample_answer\": \"...\"}, ...]}. "
            "sample_answer should be a strong, concise model answer (3-5 sentences) a top "
            "candidate might give, useful for the candidate to compare against afterward."
        )
        experience_line = (
            f"Candidate's experience level: {experience_level}. Calibrate question difficulty and "
            "depth to this level.\n"
            if experience_level.strip()
            else ""
        )
        resume_block = (
            "Candidate's resume (use it to ask at least one specific question about a real "
            f"project or piece of experience mentioned in it):\n{resume_text}\n"
            if resume_text.strip()
            else ""
        )
        user = (
            f"The FIRST question must be exactly this basic warm-up question (do not alter the "
            f'wording): "{basic_question}" -- write a tailored sample_answer for it given the '
            f"role/company context below.\n"
            f"{experience_line}"
            f"Then generate {remaining} additional realistic mock interview questions for the "
            f"role: {role}"
            + (f" at {company}" if company else "")
            + f".\nJob description context (may be empty): {job_description}\n"
            f"{resume_block}"
            "Mix behavioral questions with role-specific technical questions tailored to this "
            "role's actual industry/domain (e.g. a manufacturing role should get questions about "
            "topics like quality control or product recalls, not generic software questions). "
            "Order the additional questions from EASIEST to HARDEST -- the last question should "
            "be the most challenging. "
            f"Return {num_questions} questions total, in order, with the basic warm-up question first."
        )
        content = self._chat(system, user, override)
        data = _extract_json(content)
        questions = [
            {"text": q["text"], "sample_answer": q.get("sample_answer", "")}
            for q in list(data["questions"])[:num_questions]
        ]
        if not questions or questions[0]["text"].strip() != basic_question:
            questions.insert(0, {"text": basic_question, "sample_answer": ""})
            questions = questions[:num_questions]
        return questions

    def generate_answer_feedback(
        self,
        question: str,
        transcript: str,
        prosody: Dict[str, float],
        override: Optional[LLMOverride] = None,
    ) -> Dict[str, Any]:
        system = (
            "You are a supportive but honest interview coach. You are given a candidate's "
            "transcribed answer plus objective speech-delivery measurements. "
            "Respond ONLY with a JSON object with keys: "
            "content_score (0-100 int), delivery_score (0-100 int), "
            "content_feedback (string, 1-3 sentences on structure/specificity/STAR method), "
            "delivery_feedback (string, 1-3 sentences translating the raw speech metrics into "
            "plain-English coaching about pace, tone/monotone, filler words, and pauses)."
        )
        user = (
            f"Question: {question}\n"
            f"Transcript: {transcript}\n"
            f"Speech metrics: words_per_minute={prosody['words_per_minute']:.0f}, "
            f"pitch_variation={prosody['pitch_variation']:.2f} (0=monotone, 1=highly expressive), "
            f"filler_word_count={prosody['filler_word_count']}, "
            f"pause_ratio={prosody['pause_ratio']:.2f} (fraction of time silent), "
            f"volume_consistency={prosody['volume_consistency']:.2f} (1=very steady)."
        )
        content = self._chat(system, user, override)
        return _extract_json(content)

    def generate_report(
        self,
        role: str,
        qa_pairs: List[Dict[str, Any]],
        avg_content_score: int,
        avg_delivery_score: int,
        override: Optional[LLMOverride] = None,
    ) -> Dict[str, Any]:
        system = (
            "You are an interview coach writing a short end-of-session report. "
            "Respond ONLY with a JSON object: "
            "{\"summary\": \"2-4 sentence overview\", \"top_actions\": [\"action 1\", \"action 2\", \"action 3\"]}."
        )
        transcript_block = "\n".join(
            f"- Q: {qa['question']}\n  A: {qa['transcript']}\n"
            f"  content_score={qa['content_score']} delivery_score={qa['delivery_score']}"
            for qa in qa_pairs
        )
        user = (
            f"Role: {role}\n"
            f"Average content score: {avg_content_score}/100\n"
            f"Average delivery score: {avg_delivery_score}/100\n"
            f"Per-question detail:\n{transcript_block}\n"
            "Write an encouraging but candid summary and 3 concrete, prioritized next actions."
        )
        content = self._chat(system, user, override)
        return _extract_json(content)


gemma_client = GemmaClient()
