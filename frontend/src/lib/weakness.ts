import { AnswerFeedback } from "@/lib/api";

export function computeWeakestArea(answers: AnswerFeedback[]): string | null {
  if (answers.length === 0) return null;

  const avg = (fn: (a: AnswerFeedback) => number) => answers.reduce((s, a) => s + fn(a), 0) / answers.length;

  const scores: { label: string; score: number }[] = [
    { label: "filler words", score: Math.max(0, 1 - avg((a) => a.filler_word_count) / 5) },
    { label: "pausing and hesitation", score: Math.max(0, 1 - avg((a) => a.pause_ratio) / 0.3) },
    { label: "vocal tone and expressiveness", score: avg((a) => a.pitch_variation) },
    { label: "voice steadiness", score: avg((a) => a.volume_consistency) },
    { label: "answer structure and specificity", score: avg((a) => a.content_score) / 100 },
  ];

  scores.sort((a, b) => a.score - b.score);
  return scores[0].label;
}
