"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Recorder } from "@/components/Recorder";
import { getSession, submitAnswer, AnswerFeedback, Question } from "@/lib/api";
import { getSettings, AppSettings, DEFAULT_SETTINGS } from "@/lib/settings";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(getSettings());
    getSession(sessionId)
      .then((s) => {
        setRole(s.role);
        setCompany(s.company);
        setQuestions(s.questions);
      })
      .catch(() => setError("Couldn't load this session."));
  }, [sessionId]);

  async function handleSubmit(blob: Blob) {
    if (!questions) return;
    setError(null);
    try {
      const result = await submitAnswer(sessionId, questions[index].id, blob);
      setFeedback(result);
    } catch {
      setError("Couldn't analyze that answer. Check the backend and try again.");
    }
  }

  function handleNext() {
    if (!questions) return;
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setFeedback(null);
    } else {
      router.push(`/session/${sessionId}/report`);
    }
  }

  if (error && !questions) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <Card>
          <p className="text-red-400">{error}</p>
        </Card>
      </main>
    );
  }

  if (!questions) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-foreground/50">Loading your interview...</p>
      </main>
    );
  }

  const question = questions[index];
  const isLast = index + 1 === questions.length;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12 gap-6">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Badge>{company ? `${role} @ ${company}` : role}</Badge>
        <div className="flex gap-1.5">
          {questions.map((q, i) => (
            <span
              key={q.id}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < index ? "bg-accent" : i === index ? "bg-accent-2" : "bg-panel-border"
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-foreground/50">
          {index + 1} / {questions.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-2xl"
        >
          <Card>
            <p className="text-xs uppercase tracking-wide text-foreground/40 mb-2">Question</p>
            <h2 className="text-xl font-medium mb-6">{question.text}</h2>

            {!feedback && (
              <Recorder
                onSubmit={handleSubmit}
                timerEnabled={settings.timerEnabled}
                timerSeconds={settings.timerSeconds}
              />
            )}

            {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

            {feedback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-6 mt-2"
              >
                <div className="flex items-center justify-center gap-10">
                  <ScoreRing score={feedback.content_score} label="Content" color="var(--accent)" />
                  <ScoreRing score={feedback.delivery_score} label="Delivery" color="var(--accent-2)" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <Stat label="Pace" value={`${Math.round(feedback.words_per_minute)} wpm`} />
                  <Stat label="Fillers" value={String(feedback.filler_word_count)} />
                  <Stat label="Pauses" value={`${Math.round(feedback.pause_ratio * 100)}%`} />
                  <Stat
                    label="Tone variation"
                    value={`${Math.round(feedback.pitch_variation * 100)}%`}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <FeedbackBlock title="Content feedback" body={feedback.content_feedback} />
                  <FeedbackBlock title="Voice & tone feedback" body={feedback.delivery_feedback} />
                  {settings.sampleAnswerMode === "after" && feedback.sample_answer && (
                    <FeedbackBlock title="Sample answer" body={feedback.sample_answer} />
                  )}
                </div>

                <Button onClick={handleNext} className="self-end">
                  {isLast ? (
                    <>
                      <FileText size={16} /> View Report
                    </>
                  ) : (
                    <>
                      Next Question <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-panel-border bg-black/20 py-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-foreground/50">{label}</p>
    </div>
  );
}

function FeedbackBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-panel-border bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wide text-foreground/40 mb-1">{title}</p>
      <p className="text-sm text-foreground/80">{body}</p>
    </div>
  );
}
