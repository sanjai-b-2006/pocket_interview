export interface SessionResult {
  sessionId: string;
  role: string;
  company: string;
  date: string; // ISO string
  avgContentScore: number;
  avgDeliveryScore: number;
  fillerWordAvg: number;
}

const STORAGE_KEY = "pic_history";
const MAX_ENTRIES = 100;

export function getHistory(): SessionResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordSessionResult(result: SessionResult) {
  if (typeof window === "undefined") return;
  const history = getHistory();
  if (history.some((h) => h.sessionId === result.sessionId)) return; // avoid duplicates on re-visit
  const updated = [...history, result].slice(-MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function computeStreak(history: SessionResult[]): number {
  if (history.length === 0) return 0;
  const days = new Set(history.map((h) => h.date.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export interface Badge {
  label: string;
  description: string;
}

export function computeBadges(history: SessionResult[]): Badge[] {
  const badges: Badge[] = [];
  if (history.length === 0) return badges;

  if (history.length >= 1) badges.push({ label: "First Steps", description: "Completed your first mock interview" });
  if (history.length >= 5) badges.push({ label: "Committed", description: "Completed 5 practice sessions" });
  if (history.length >= 10) badges.push({ label: "Dedicated", description: "Completed 10 practice sessions" });

  const streak = computeStreak(history);
  if (streak >= 3) badges.push({ label: "On a Roll", description: `${streak}-day practice streak` });

  const avgFillers = history.reduce((s, h) => s + h.fillerWordAvg, 0) / history.length;
  if (avgFillers < 1) badges.push({ label: "Filler-Word Free", description: "Averaging under 1 filler word per answer" });

  const last3 = history.slice(-3);
  if (last3.length === 3 && last3.every((h) => h.avgDeliveryScore >= 75)) {
    badges.push({ label: "Steady Pacer", description: "Strong delivery score across your last 3 sessions" });
  }

  const avgContent = history.reduce((s, h) => s + h.avgContentScore, 0) / history.length;
  if (avgContent >= 85) badges.push({ label: "Sharp Storyteller", description: "Averaging 85+ on content across all sessions" });

  return badges;
}
