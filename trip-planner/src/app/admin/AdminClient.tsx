// src/app/admin/AdminClient.tsx
"use client";

import { useEffect, useState } from "react";

export default function AdminClient() {
  const [metrics, setMetrics] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/metrics", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setMetrics)
      .catch((e) => setErr(e?.message ?? "Failed to load metrics"));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin Analytics</h1>
          <a className="underline text-sm text-zinc-600" href="/">
            Home
          </a>
        </div>

        {err ? (
          <div className="rounded border bg-white p-4 text-red-600">{err}</div>
        ) : !metrics ? (
          <div className="rounded border bg-white p-4">Loading...</div>
        ) : (
          <pre className="rounded border bg-white p-4 overflow-x-auto text-sm">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
