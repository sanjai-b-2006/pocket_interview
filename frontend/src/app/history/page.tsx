"use client";

import { useEffect, useState } from "react";
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
import { Award, Flame, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getHistory, computeStreak, computeBadges } from "@/lib/history";
import type { SessionResult } from "@/lib/history";

export default function HistoryPage() {
  const [history, setHistory] = useState<SessionResult[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const streak = computeStreak(history);
  const badges = computeBadges(history);
  const chartData = history.map((h, i) => ({
    session: `#${i + 1}`,
    content: Math.round(h.avgContentScore),
    delivery: Math.round(h.avgDeliveryScore),
  }));

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl flex flex-col gap-6"
      >
        <div className="text-center">
          <h1 className="text-4xl font-semibold gradient-text">Your Progress</h1>
          <p className="text-foreground/50 mt-1">
            {history.length === 0
              ? "Complete a session to start tracking your progress"
              : `${history.length} session${history.length === 1 ? "" : "s"} practiced on this device`}
          </p>
        </div>

        {history.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-foreground/60 mb-4">No sessions yet on this device.</p>
            <Link href="/">
              <Button>
                Start your first interview <ArrowRight size={16} />
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="flex items-center gap-3">
                <Flame size={22} className="text-accent-2" />
                <div>
                  <p className="text-2xl font-semibold">{streak}</p>
                  <p className="text-xs text-foreground/50">day streak</p>
                </div>
              </Card>
              <Card className="flex items-center gap-3">
                <Award size={22} className="text-accent" />
                <div>
                  <p className="text-2xl font-semibold">{badges.length}</p>
                  <p className="text-xs text-foreground/50">badges earned</p>
                </div>
              </Card>
            </div>

            {badges.length > 0 && (
              <Card>
                <p className="text-xs uppercase tracking-wide text-foreground/40 mb-3">Badges</p>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <Badge key={b.label} title={b.description} className="py-2">
                      {b.label}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <p className="text-xs uppercase tracking-wide text-foreground/40 mb-3">Score trend across sessions</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="var(--panel-border)" strokeDasharray="4 4" />
                    <XAxis dataKey="session" stroke="#8888a0" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="#8888a0" fontSize={12} />
                    <Tooltip contentStyle={{ background: "#0f0f1a", border: "1px solid #24243a", borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="content" stroke="var(--accent)" strokeWidth={2} name="Content" />
                    <Line type="monotone" dataKey="delivery" stroke="var(--accent-2)" strokeWidth={2} name="Delivery" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-wide text-foreground/40 mb-3">Session history</p>
              <div className="flex flex-col gap-2">
                {[...history].reverse().map((h) => (
                  <Link
                    key={h.sessionId}
                    href={`/session/${h.sessionId}/report`}
                    className="flex items-center justify-between rounded-xl border border-panel-border bg-black/20 px-4 py-3 hover:border-accent/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{h.company ? `${h.role} @ ${h.company}` : h.role}</p>
                      <p className="text-xs text-foreground/40">{new Date(h.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs text-foreground/50 whitespace-nowrap">
                      {Math.round(h.avgContentScore)}/100 content &middot; {Math.round(h.avgDeliveryScore)}/100 delivery
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          </>
        )}

        <Link href="/" className="self-center">
          <Button variant="secondary">Start New Interview</Button>
        </Link>
      </motion.div>
    </main>
  );
}
