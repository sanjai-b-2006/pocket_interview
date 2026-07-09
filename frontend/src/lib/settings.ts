export type SampleAnswerMode = "after" | "end" | "off";

export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  sampleAnswerMode: SampleAnswerMode;
  timerEnabled: boolean;
  timerSeconds: number;
}

const STORAGE_KEY = "pic_settings";

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "google/gemma-4-26b-a4b-it",
  sampleAnswerMode: "end",
  timerEnabled: false,
  timerSeconds: 90,
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const merged = { ...getSettings(), ...settings };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

/** Only override the server's own key/model when the user has actually entered their own key. */
export function llmHeaders(): Record<string, string> {
  const s = getSettings();
  if (!s.apiKey) return {};
  const headers: Record<string, string> = { "X-Llm-Api-Key": s.apiKey };
  if (s.baseUrl) headers["X-Llm-Base-Url"] = s.baseUrl;
  if (s.model) headers["X-Llm-Model"] = s.model;
  return headers;
}
