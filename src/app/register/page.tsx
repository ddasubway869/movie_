"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push("/browse");
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      await login(username.trim(), password);
      router.push("/browse");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const inputBase = {
    background: "var(--input-bg)",
    borderColor: "var(--input-border)",
    color: "var(--fg)",
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">SLATE</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-hint)" }}>Create an account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none"
            style={inputBase}
            onFocus={(e) => { e.target.style.background = "var(--input-bg-focus)"; e.target.style.borderColor = "var(--input-border-focus)"; }}
            onBlur={(e) => { e.target.style.background = "var(--input-bg)"; e.target.style.borderColor = "var(--input-border)"; }}
            autoFocus
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none"
            style={inputBase}
            onFocus={(e) => { e.target.style.background = "var(--input-bg-focus)"; e.target.style.borderColor = "var(--input-border-focus)"; }}
            onBlur={(e) => { e.target.style.background = "var(--input-bg)"; e.target.style.borderColor = "var(--input-border)"; }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none"
            style={{ ...inputBase, borderColor: error ? "rgba(239,68,68,0.5)" : "var(--input-border)" }}
            onFocus={(e) => { e.target.style.background = "var(--input-bg-focus)"; if (!error) e.target.style.borderColor = "var(--input-border-focus)"; }}
            onBlur={(e) => { e.target.style.background = "var(--input-bg)"; if (!error) e.target.style.borderColor = "var(--input-border)"; }}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username.trim() || !email.trim() || !password}
            className="w-full rounded-lg py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: "var(--btn-primary-fg)", borderTopColor: "transparent", opacity: 0.6 }} />
                Creating account...
              </span>
            ) : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-hint)" }}>
          Already have an account?{" "}
          <Link href="/" className="underline" style={{ color: "var(--fg)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
