"use client";

import { useEffect, useState } from "react";

type PendingUser = {
  id: string;
  email: string;
  role: "ADMIN";
  status: "PENDING";
  createdAt: string;
};

export default function AdminUsersPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/pending-admins?t=${Date.now()}`, {
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load pending admins.");

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
      if (!res.ok) throw new Error(json?.error ?? "Failed to approve admin.");

      // remove from list immediately
      setPending((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to approve.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Admin Approvals</h1>
            <div className="text-sm text-zinc-600">
              Approve pending admin accounts.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a className="underline text-sm text-zinc-600" href="/admin">
              Admin
            </a>
            <a className="underline text-sm text-zinc-600" href="/">
              Home
            </a>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">
              Pending admins: <span className="font-medium text-zinc-900">{pending.length}</span>
            </div>

            <button
              type="button"
              onClick={load}
              className="px-3 py-1.5 rounded border bg-white hover:bg-zinc-100 text-sm text-zinc-900"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {err ? (
            <div className="text-sm text-red-700 border rounded p-3 bg-red-50">
              {err}
              <div className="text-xs text-zinc-600 mt-1">
                If you see <span className="font-mono">UNAUTHORIZED</span> or{" "}
                <span className="font-mono">FORBIDDEN</span>, you are not logged in as an approved admin.
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-zinc-600">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="text-sm text-zinc-600">No pending admins.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-zinc-600">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Requested</th>
                    <th className="py-2 pr-0 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pending.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-zinc-900">{u.email}</div>
                        <div className="text-xs text-zinc-500">
                          Role: {u.role} · Status: {u.status}
                        </div>
                      </td>

                      <td className="py-2 pr-3 text-zinc-700">
                        {new Date(u.createdAt).toLocaleString()}
                      </td>

                      <td className="py-2 pr-0 text-right">
                        <button
                          type="button"
                          onClick={() => approve(u.id)}
                          disabled={busyId === u.id}
                          className="px-3 py-1.5 rounded border bg-black text-white disabled:opacity-50"
                        >
                          {busyId === u.id ? "Approving..." : "Approve"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 text-xs text-zinc-500">
                Tip: after approving, the user can log in normally.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
