"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, RotateCcw, Share2, Download, Sparkles, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { MarkdownLite } from "@/components/MarkdownLite";
import { getReport, getCheatSheet, ReportResponse } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { computeWeakestArea } from "@/lib/weakness";
import { recordSessionResult } from "@/lib/history";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSamples, setShowSamples] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cheatSheet, setCheatSheet] = useState<string | null>(null);
  const [cheatSheetLoading, setCheatSheetLoading] = useState(false);

  useEffect(() => {
    setShowSamples(getSettings().sampleAnswerMode === "end");
    getReport(sessionId)
      .then((r) => {
        setReport(r);
        recordSessionResult({
          sessionId: r.session_id,
          role: r.role,
          company: r.company,
          date: new Date().toISOString(),
          avgContentScore: r.avg_content_score,
          avgDeliveryScore: r.avg_delivery_score,
          fillerWordAvg: r.answers.reduce((s, a) => s + a.filler_word_count, 0) / Math.max(r.answers.length, 1),
        });
      })
      .catch(() => setError("Couldn't generate the report for this session."));
  }, [sessionId]);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable -- silently ignore, not critical
    }
  }

  async function handleCheatSheet() {
    setCheatSheetLoading(true);
    try {
      const sheet = await getCheatSheet(sessionId);
      setCheatSheet(sheet);
    } catch {
      setCheatSheet("Couldn't generate a cheat sheet right now -- try again in a moment.");
    } finally {
      setCheatSheetLoading(false);
    }
  }

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <Card>
          <p className="text-red-400">{error}</p>
        </Card>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-foreground/50">Building your report...</p>
      </main>
    );
  }

  const chartData = report.answers.map((a, i) => ({
    question: `Q${i + 1}`,
    content: a.content_score,
    delivery: a.delivery_score,
  }));
  const weakestArea = computeWeakestArea(report.answers);
  const drillUrl = weakestArea
    ? `/?drill=${encodeURIComponent(weakestArea)}&role=${encodeURIComponent(report.role)}&company=${encodeURIComponent(report.company)}&experienceLevel=${encodeURIComponent(report.experience_level)}`
    : "/";

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12 gap-6 print:px-0 print:py-0">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl flex flex-col gap-6"
      >
        <div className="text-center flex flex-col items-center gap-3">
          <h1 className="text-4xl sm:text-5xl font-semibold gradient-text">Session Report</h1>
          <p className="text-foreground/50">Here&apos;s how the interview went</p>
          <div className="flex flex-wrap justify-center gap-2 print:hidden">
            <Button variant="secondary" onClick={handleShare}>
              <Share2 size={16} /> {copied ? "Link copied!" : "Copy share link"}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Download size={16} /> Download PDF
            </Button>
          </div>
        </div>

        <Card className="flex flex-col sm:flex-row items-center gap-8">
          <div className="flex gap-8">
            <ScoreRing score={report.avg_content_score} label="Avg Content" color="var(--accent)" />
            <ScoreRing score={report.avg_delivery_score} label="Avg Delivery" color="var(--accent-2)" />
          </div>
          <p className="text-base text-foreground/80 leading-relaxed">{report.summary}</p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-foreground/40 mb-3">Score trend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--panel-border)" strokeDasharray="4 4" />
                <XAxis dataKey="question" stroke="#8888a0" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#8888a0" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#0f0f1a", border: "1px solid #24243a", borderRadius: 8 }}
                />
                <Legend />
                <Line type="monotone" dataKey="content" stroke="var(--accent)" strokeWidth={2} name="Content" />
                <Line
                  type="monotone"
                  dataKey="delivery"
                  stroke="var(--accent-2)"
                  strokeWidth={2}
                  name="Delivery"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-foreground/40 mb-3">Top actions</p>
          <ul className="flex flex-col gap-2">
            {report.top_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-base text-foreground/80">
                <CheckCircle2 size={18} className="text-accent-2 mt-0.5 shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </Card>

        {weakestArea && (
          <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-accent-2 shrink-0" />
              <p className="text-sm text-foreground/80">
                Your biggest opportunity this session: <span className="text-foreground font-medium">{weakestArea}</span>.
              </p>
            </div>
            <Link href={drillUrl}>
              <Button variant="secondary" className="whitespace-nowrap">
                Drill this
              </Button>
            </Link>
          </Card>
        )}

        <Card className="print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <p className="text-xs uppercase tracking-wide text-foreground/40">Personalized cheat sheet</p>
            {!cheatSheet && (
              <Button variant="secondary" onClick={handleCheatSheet} disabled={cheatSheetLoading}>
                <Sparkles size={16} /> {cheatSheetLoading ? "Generating..." : "Generate my cheat sheet"}
              </Button>
            )}
          </div>
          {cheatSheet && <MarkdownLite text={cheatSheet} />}
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-foreground/40 mb-3">Per-question detail</p>
          <div className="flex flex-col gap-4">
            {report.answers.map((a, i) => (
              <div key={i} className="rounded-xl border border-panel-border bg-black/20 p-4">
                <div className="flex items-center justify-between mb-2 gap-4">
                  <span className="text-base font-medium">
                    Q{i + 1}: {a.question}
                  </span>
                  <span className="text-xs text-foreground/50 whitespace-nowrap">
                    {a.content_score}/100 content &middot; {a.delivery_score}/100 delivery
                  </span>
                </div>
                <p className="text-sm text-foreground/60 italic mb-2">&ldquo;{a.transcript}&rdquo;</p>
                <p className="text-sm text-foreground/80">{a.content_feedback}</p>
                <p className="text-sm text-foreground/80 mt-1">{a.delivery_feedback}</p>
                {showSamples && a.sample_answer && (
                  <div className="mt-3 rounded-lg border border-panel-border/60 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-foreground/40 mb-1">
                      Sample answer
                    </p>
                    <p className="text-sm text-foreground/70">{a.sample_answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3 self-center print:hidden">
          <Link href="/history">
            <Button variant="ghost">View progress history</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">
              <RotateCcw size={16} /> Start New Interview
            </Button>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
