"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Mic, LineChart, Paperclip, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createSession } from "@/lib/api";
import { getSettings, saveSettings, SampleAnswerMode } from "@/lib/settings";

const PRESET_ROLES = ["Software Engineer", "Product Manager", "Data Analyst"];
const SAMPLE_ANSWER_OPTIONS: { value: SampleAnswerMode; label: string }[] = [
  { value: "after", label: "After each answer" },
  { value: "end", label: "At the end" },
  { value: "off", label: "Don't show" },
];
const EXPERIENCE_LEVELS = [
  "Entry-level (0-1 yrs)",
  "Mid-level (2-5 yrs)",
  "Senior (5+ yrs)",
  "Staff/Lead (8+ yrs)",
];

export default function HomePage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [experienceLevel, setExperienceLevel] = useState(EXPERIENCE_LEVELS[1]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [sampleAnswerMode, setSampleAnswerMode] = useState<SampleAnswerMode>("end");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = getSettings();
    setSampleAnswerMode(s.sampleAnswerMode);
    setTimerEnabled(s.timerEnabled);
    setTimerSeconds(s.timerSeconds);
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!role.trim()) {
      setError("Enter a target role to generate your interview.");
      return;
    }
    setError(null);
    setLoading(true);
    saveSettings({ sampleAnswerMode, timerEnabled, timerSeconds });
    try {
      const session = await createSession(
        role.trim(),
        company.trim(),
        jobDescription.trim(),
        numQuestions,
        experienceLevel,
        resumeFile
      );
      router.push(`/session/${session.session_id}`);
    } catch {
      setError("Couldn't start the session. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center gap-4 max-w-2xl"
      >
        <Badge>
          <Sparkles size={12} className="mr-1" /> Powered by Gemma 4
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          <span className="gradient-text">Pocket Interview Coach</span>
        </h1>
        <p className="text-foreground/60 text-lg">
          Practice out loud. Get coached on what you said <span className="text-foreground">and</span> how
          you said it &mdash; pace, tone, filler words, and confidence.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="w-full max-w-xl mt-10"
      >
        <Card>
          <form onSubmit={handleStart} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">Target role</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="rounded-xl border border-panel-border bg-black/20 px-4 py-3 text-sm outline-none focus:border-accent"
              />
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESET_ROLES.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setRole(preset)}
                    className="text-xs rounded-full border border-panel-border px-3 py-1 text-foreground/60 hover:text-foreground hover:border-accent/60 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">
                Company <span className="text-foreground/40">(optional)</span>
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="rounded-xl border border-panel-border bg-black/20 px-4 py-3 text-sm outline-none focus:border-accent"
              />
              <p className="text-xs text-foreground/40">
                Every interview includes at least one basic warm-up question (e.g. &ldquo;Tell me
                about yourself&rdquo; or &ldquo;What do you know about {company || "the company"}
                ?&rdquo;).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">
                Job description <span className="text-foreground/40">(optional)</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={3}
                placeholder="Paste a job description for more tailored questions"
                className="rounded-xl border border-panel-border bg-black/20 px-4 py-3 text-sm outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground/80">Number of questions</label>
                <span className="text-sm font-semibold text-accent-2">{numQuestions}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                style={{ accentColor: "var(--accent)" }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">Experience level</label>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setExperienceLevel(level)}
                    className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                      experienceLevel === level
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-panel-border text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-xs text-foreground/40">
                Question difficulty is calibrated to this level, and always ordered easy to hard.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">
                Resume <span className="text-foreground/40">(optional)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              />
              {resumeFile ? (
                <div className="flex items-center justify-between rounded-xl border border-panel-border bg-black/20 px-4 py-3 text-sm">
                  <span className="truncate">{resumeFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setResumeFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-foreground/50 hover:text-foreground"
                    aria-label="Remove resume"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-panel-border px-4 py-3 text-sm text-foreground/60 hover:text-foreground hover:border-accent/60 transition-colors"
                >
                  <Paperclip size={16} /> Attach resume (PDF or text)
                </button>
              )}
              <p className="text-xs text-foreground/40">
                If attached, at least one question will ask about a specific project from it.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">Sample answers</label>
              <div className="flex gap-2">
                {SAMPLE_ANSWER_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setSampleAnswerMode(opt.value)}
                    className={`flex-1 rounded-xl border px-2 py-2 text-xs transition-colors ${
                      sampleAnswerMode === opt.value
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-panel-border text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <input
                  type="checkbox"
                  checked={timerEnabled}
                  onChange={(e) => setTimerEnabled(e.target.checked)}
                  style={{ accentColor: "var(--accent)" }}
                  className="cursor-pointer"
                />
                Enable answer timer
              </label>
              {timerEnabled && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={30}
                    max={300}
                    step={15}
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Number(e.target.value))}
                    style={{ accentColor: "var(--accent)" }}
                    className="w-full cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-accent-2 whitespace-nowrap">
                    {timerSeconds}s
                  </span>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full justify-center">
              {loading ? "Generating your interview..." : "Start Mock Interview"}
            </Button>
          </form>
        </Card>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Card className="flex items-center gap-3 py-4">
            <Mic size={18} className="text-accent-2" />
            <span className="text-sm text-foreground/70">Live delivery &amp; tone scoring</span>
          </Card>
          <Card className="flex items-center gap-3 py-4">
            <LineChart size={18} className="text-accent" />
            <span className="text-sm text-foreground/70">End-of-session report</span>
          </Card>
        </div>
      </motion.div>
    </main>
  );
}
