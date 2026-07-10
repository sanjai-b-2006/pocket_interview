"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, FileText, Volume2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Recorder } from "@/components/Recorder";
import { getSession, submitAnswer, AnswerFeedback, Question } from "@/lib/api";
import { getSettings, AppSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { personaLabel } from "@/lib/constants";

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
  const [speaking, setSpeaking] = useState(false);

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
      if (result.follow_up_question) {
        const followUp = result.follow_up_question;
        setQuestions((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next.splice(index + 1, 0, followUp);
          return next;
        });
      }
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

  function speakQuestion(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
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
  const timelineData = (feedback?.delivery_timeline || []).map((p) => ({
    t: `${Math.round(p.t)}s`,
    wpm: Math.round(p.words_per_minute),
    tone: Math.round(p.pitch_variation * 100),
  }));

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
        <span className="text-base text-foreground/50">
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-foreground/40">
                Question{question.is_dynamic ? " · follow-up" : ""}
              </p>
              <div className="flex items-center gap-2">
                {question.persona && <Badge className="text-xs">{personaLabel(question.persona)}</Badge>}
                <button
                  type="button"
                  onClick={() => speakQuestion(question.text)}
                  className={`text-foreground/50 hover:text-foreground transition-colors ${speaking ? "text-accent-2" : ""}`}
                  aria-label="Play question aloud"
                >
                  <Volume2 size={18} />
                </button>
              </div>
            </div>
            <h2 className="text-2xl font-medium mb-6">{question.text}</h2>

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

                {timelineData.length > 1 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-foreground/40 mb-2">
                      Delivery over time
                    </p>
                    <div className="h-32 rounded-xl border border-panel-border bg-black/20 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData}>
                          <CartesianGrid stroke="var(--panel-border)" strokeDasharray="4 4" />
                          <XAxis dataKey="t" stroke="#8888a0" fontSize={10} />
                          <YAxis stroke="#8888a0" fontSize={10} />
                          <Tooltip
                            contentStyle={{ background: "#0f0f1a", border: "1px solid #24243a", borderRadius: 8 }}
                          />
                          <Line type="monotone" dataKey="wpm" stroke="var(--accent-2)" strokeWidth={2} dot={false} name="Pace (wpm)" />
                          <Line type="monotone" dataKey="tone" stroke="var(--accent)" strokeWidth={2} dot={false} name="Tone %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <FeedbackBlock title="Content feedback" body={feedback.content_feedback} />
                  <FeedbackBlock title="Voice & tone feedback" body={feedback.delivery_feedback} />
                  {settings.sampleAnswerMode === "after" && feedback.sample_answer && (
                    <FeedbackBlock title="Sample answer" body={feedback.sample_answer} />
                  )}
                </div>

                {feedback.follow_up_question && (
                  <div className="rounded-xl border border-accent/50 bg-accent/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-accent-2 mb-1">
                      Follow-up incoming
                    </p>
                    <p className="text-sm text-foreground/80">
                      Your interviewer wants to dig deeper &mdash; a follow-up question has been
                      added right after this one.
                    </p>
                  </div>
                )}

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
