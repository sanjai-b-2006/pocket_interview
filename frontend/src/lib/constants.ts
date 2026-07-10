export const PRESET_ROLES = ["Software Engineer", "Product Manager", "Data Analyst"];

export const EXPERIENCE_LEVELS = [
  "Entry-level (0-1 yrs)",
  "Mid-level (2-5 yrs)",
  "Senior (5+ yrs)",
  "Staff/Lead (8+ yrs)",
];

export const SESSION_TYPES: { value: string; label: string; description: string }[] = [
  { value: "job_interview", label: "Job Interview", description: "Standard mock interview practice" },
  { value: "salary_negotiation", label: "Salary Negotiation", description: "Practice negotiating an offer" },
  { value: "performance_review", label: "Performance Review", description: "Manager/employee review conversation" },
  { value: "difficult_feedback", label: "Difficult Feedback", description: "Practice a hard conversation" },
];

export const PERSONAS: { value: string; label: string; description: string }[] = [
  { value: "", label: "Default", description: "Balanced, neutral interviewer" },
  { value: "friendly_recruiter", label: "Friendly Recruiter", description: "Warm and encouraging" },
  { value: "tough_tech_lead", label: "Tough Tech Lead", description: "Probing and precise" },
  { value: "skeptical_panel", label: "Skeptical Panel", description: "Questions every assumption" },
  { value: "rapid_fire_founder", label: "Rapid-Fire Founder", description: "Fast, direct, high-signal" },
];

export function personaLabel(value: string): string {
  return PERSONAS.find((p) => p.value === value)?.label || "";
}

export function sessionTypeLabel(value: string): string {
  return SESSION_TYPES.find((t) => t.value === value)?.label || "Job Interview";
}
