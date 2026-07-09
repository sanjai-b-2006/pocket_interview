"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DEFAULT_SETTINGS, getSettings, saveSettings, AppSettings } from "@/lib/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl flex flex-col gap-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-semibold gradient-text">Settings</h1>
          <p className="text-foreground/50 mt-1">
            Bring your own API key to run this app on your own LLM credits
          </p>
        </div>

        <Card>
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <KeyRound size={14} /> Your API key <span className="text-foreground/40">(optional)</span>
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="sk-or-v1-... or fw_..."
                className="rounded-xl border border-panel-border bg-black/20 px-4 py-3 text-sm outline-none focus:border-accent font-mono"
              />
              <p className="text-xs text-foreground/40">
                Leave blank to use the app&apos;s default key. If set, every request uses your key
                instead, via the {"{"}baseUrl{"}"}/chat/completions endpoint.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">API base URL</label>
              <input
                value={settings.baseUrl}
                onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                placeholder="https://openrouter.ai/api/v1"
                className="rounded-xl border border-panel-border bg-black/20 px-4 py-3 text-sm outline-none focus:border-accent font-mono"
              />
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "OpenRouter", url: "https://openrouter.ai/api/v1" },
                  { label: "Fireworks", url: "https://api.fireworks.ai/inference/v1" },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => setSettings({ ...settings, baseUrl: p.url })}
                    className="text-xs rounded-full border border-panel-border px-3 py-1 text-foreground/60 hover:text-foreground hover:border-accent/60 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">Model</label>
              <input
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                placeholder="google/gemma-4-26b-a4b-it"
                className="rounded-xl border border-panel-border bg-black/20 px-4 py-3 text-sm outline-none focus:border-accent font-mono"
              />
            </div>

            <Button type="submit" className="w-full justify-center">
              <Save size={16} /> {saved ? "Saved!" : "Save Settings"}
            </Button>
          </form>
        </Card>

        <Link href="/" className="self-center text-sm text-foreground/50 hover:text-foreground">
          Back to home
        </Link>
      </motion.div>
    </main>
  );
}
