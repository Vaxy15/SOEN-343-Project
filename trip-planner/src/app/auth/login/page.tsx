"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Login failed");

      setMsg(`Logged in as ${json.user.email} (${json.user.role})`);
    } catch (e: any) {
      setMsg(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Log in</h1>
          <a className="underline text-sm text-zinc-600" href="/">Home</a>
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Email</div>
            <input
              className="w-full border rounded px-3 py-2 text-zinc-900 bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Password</div>
            <input
              className="w-full border rounded px-3 py-2 text-zinc-900 bg-white"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="your password"
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          {msg && <div className="text-sm text-zinc-700">{msg}</div>}

          <div className="text-sm text-zinc-600">
            No account?{" "}
            <a className="underline" href="/auth/register">Create one</a>
          </div>
        </div>
      </div>
    </main>
  );
}
