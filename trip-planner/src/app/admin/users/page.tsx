"use client";

import { useEffect, useState } from "react";

type PendingUser = { id: string; email: string; role: "ADMIN"; status: "PENDING"; createdAt: string };

export default function AdminUsersPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/pending-admins?t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
      setPending(json?.users ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  async function approve(userId: string) {
    setBusyId(userId);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/approve-admin?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to approve.");
      setPending((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to approve.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Approve or reject pending admin accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin" className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 transition">← Dashboard</a>
          <button onClick={load} disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 transition disabled:opacity-50">
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          {err}
          {err.includes("UNAUTHORIZED") || err.includes("Forbidden") ? (
            <div className="text-xs text-slate-500 mt-1">You must be an approved admin to view this page.</div>
          ) : null}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">
            Pending approvals
            <span className="ml-2 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">{pending.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="text-2xl">✅</div>
            <div className="text-sm font-semibold text-slate-700">All clear</div>
            <div className="text-sm text-slate-400">No pending admin accounts</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{u.email}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Requested {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-medium">PENDING</span>
                  </div>
                </div>
                <button onClick={() => approve(u.id)} disabled={busyId === u.id}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 shrink-0">
                  {busyId === u.id ? "Approving…" : "Approve"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
          Approved admins can log in immediately after approval.
        </div>
      </div>
    </div>
  );
}
