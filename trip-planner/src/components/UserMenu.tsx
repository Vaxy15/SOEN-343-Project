"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: "USER" | "ADMIN";
  status: "PENDING" | "APPROVED" | "REJECTED";
} | null;

export default function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const displayName = user?.name ?? user?.email ?? "Account";
  const initial = displayName.slice(0, 1).toUpperCase();

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      setBusy(false);
      setOpen(false);
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 transition shadow-sm"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-xs font-bold">
          {initial}
        </span>
        <span className="text-sm text-slate-700 hidden sm:block max-w-[140px] truncate font-medium">
          {user ? displayName : "Sign in"}
        </span>
        <span className="text-slate-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-100 bg-white shadow-lg overflow-hidden">
          {!user ? (
            <div className="p-2 space-y-1">
              <Link href="/auth/login" onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition font-medium">
                Log in
              </Link>
              <Link href="/auth/register" onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition font-medium">
                Create account
              </Link>
            </div>
          ) : (
            <div className="p-2">
              <div className="px-3 py-2 mb-1">
                <div className="text-xs text-slate-400">Signed in as</div>
                <div className="text-sm font-semibold text-slate-800 truncate">{displayName}</div>
              </div>
              <div className="h-px bg-slate-100 mx-1 mb-1" />
              <Link href="/account" onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition font-medium">
                My Account
              </Link>
              <Link href="/orders" onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition font-medium">
                My Orders
              </Link>
              <div className="h-px bg-slate-100 mx-1 my-1" />
              <button type="button" onClick={logout} disabled={busy}
                className="w-full text-left rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition font-medium disabled:opacity-50">
                {busy ? "Logging out…" : "Log out"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}