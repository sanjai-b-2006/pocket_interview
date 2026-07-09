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
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { getReport, ReportResponse } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSamples, setShowSamples] = useState(false);

  useEffect(() => {
    setShowSamples(getSettings().sampleAnswerMode === "end");
    getReport(sessionId)
      .then(setReport)
      .catch(() => setError("Couldn't generate the report for this session."));
  }, [sessionId]);

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

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl flex flex-col gap-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-semibold gradient-text">Session Report</h1>
          <p className="text-foreground/50 mt-1">Here&apos;s how the interview went</p>
        </div>

        <Card className="flex flex-col sm:flex-row items-center gap-8">
          <div className="flex gap-8">
            <ScoreRing score={report.avg_content_score} label="Avg Content" color="var(--accent)" />
            <ScoreRing score={report.avg_delivery_score} label="Avg Delivery" color="var(--accent-2)" />
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{report.summary}</p>
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
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <CheckCircle2 size={16} className="text-accent-2 mt-0.5 shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-foreground/40 mb-3">Per-question detail</p>
          <div className="flex flex-col gap-4">
            {report.answers.map((a, i) => (
              <div key={i} className="rounded-xl border border-panel-border bg-black/20 p-4">
                <div className="flex items-center justify-between mb-2 gap-4">
                  <span className="text-sm font-medium">
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

        <Link href="/" className="self-center">
          <Button variant="secondary">
            <RotateCcw size={16} /> Start New Interview
          </Button>
        </Link>
      </motion.div>
    </main>
  );
}
