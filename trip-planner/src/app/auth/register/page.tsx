"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDoneMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name, email, password }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Registration failed.");

      if (json?.user?.role === "ADMIN") {
        setDoneMsg(
          "Admin account created and is pending approval. You will be able to log in once approved."
        );
      } else {
        // Normal users can go straight to login
        window.location.href = "/auth/login";
        return;
      }
    } catch (e: any) {
      setErr(e?.message ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl border bg-white p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">Create Account</h1>

        {err && (
          <div className="text-sm text-red-700 border border-red-200 rounded p-2 bg-red-50">
            {err}
          </div>
        )}

        {doneMsg && (
          <div className="text-sm text-emerald-800 border border-emerald-200 rounded p-2 bg-emerald-50">
            {doneMsg}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Account Type</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin (requires approval)</option>
          </select>

          {role === "ADMIN" && (
            <p className="mt-1 text-xs text-zinc-600">
              Admin accounts are created as <b>PENDING</b> and must be approved before logging in.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <button
          disabled={loading}
          className="w-full py-2 rounded-lg bg-black text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        <div className="text-center">
          <a className="underline text-sm text-zinc-700" href="/auth/login">
            Already have an account? Login
          </a>
        </div>
      </form>
    </div>
  );
}
