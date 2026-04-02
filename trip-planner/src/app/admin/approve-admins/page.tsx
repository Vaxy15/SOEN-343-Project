// SOEN-343-Project\trip-planner\src\app\admin\approve-admins\page.tsx
"use client";

import { useEffect, useState } from "react";

export default function ApproveAdminsPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/pending-admins", { cache: "no-store" });
    const json = await res.json();
    setPending(json);
    setLoading(false);
  }

  async function approve(userId: string) {
    const res = await fetch("/api/admin/approve-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const json = await res.json();
    console.log("approve result", json);
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Approve Admin Accounts</h1>
          <a className="underline text-sm text-zinc-600" href="/">
            Home
          </a>
        </div>

        {loading ? (
          <div className="rounded border bg-white p-4">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="rounded border bg-white p-4">No pending admins.</div>
        ) : (
          <div className="rounded border bg-white p-4 space-y-3">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{u.email}</div>
                  <div className="text-xs text-zinc-500">
                    role={u.role} status={u.status}
                  </div>
                </div>
                <button
                  className="px-3 py-1.5 rounded bg-black text-white"
                  onClick={() => approve(u.id)}
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
