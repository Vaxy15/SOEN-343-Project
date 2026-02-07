"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/metrics").then((r) => r.json()).then(setMetrics);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin Analytics</h1>
          <a className="underline text-sm text-zinc-600" href="/">
            Home
          </a>
        </div>

        {!metrics ? (
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
