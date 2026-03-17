"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";

function SettingsContent() {
  const { user, refreshUser } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ torboxApiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaved(true);
      setApiKey("");
      await refreshUser();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Settings</h1>

      <section className="rounded-xl border p-6" style={{ borderColor: "var(--border-c)" }}>
        <h2 className="mb-1 text-base font-semibold">TorBox API Key</h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-hint)" }}>
          {user?.hasApiKey
            ? "Your API key is set. Enter a new one to replace it."
            : "Enter your TorBox API key to enable streaming."}
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={user?.hasApiKey ? "Enter new API key to replace" : "Paste your TorBox API key"}
            className="w-full rounded-lg border px-4 py-3 font-mono text-sm outline-none"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--fg)" }}
            onFocus={(e) => { e.target.style.background = "var(--input-bg-focus)"; e.target.style.borderColor = "var(--input-border-focus)"; }}
            onBlur={(e) => { e.target.style.background = "var(--input-bg)"; e.target.style.borderColor = "var(--input-border)"; }}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          {saved && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>API key saved successfully.</p>}

          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border p-6" style={{ borderColor: "var(--border-c)" }}>
        <h2 className="mb-1 text-base font-semibold">Account</h2>
        <p className="text-sm" style={{ color: "var(--text-hint)" }}>
          Signed in as <span style={{ color: "var(--fg)" }}>{user?.username}</span> &middot; {user?.email}
        </p>
      </section>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Header />
      <SettingsContent />
    </AuthGuard>
  );
}
