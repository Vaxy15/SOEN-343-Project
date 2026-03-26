"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SessionUser =
  | {
      id: string;
      email: string;
      name?: string | null;
      role: "USER" | "ADMIN";
      status: "PENDING" | "APPROVED" | "REJECTED";
    }
  | null;

export default function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const displayName = user?.name ?? user?.email ?? "Account";
  const initial = user ? displayName.slice(0, 1).toUpperCase() : "?";

  async function logout() {
    if (busy) return;
    setBusy(true);

    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      setBusy(false);
      setOpen(false);
      // ✅ force server components (NavBar) to re-read cookies
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 hover:bg-zinc-50 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-blue)] text-white text-sm font-semibold">
          {initial}
        </span>

        <span className="text-sm text-[var(--brand-dark)] hidden sm:block max-w-[180px] truncate">
          {user ? displayName : "Sign in"}
        </span>

        <span className="text-zinc-500 text-xs">▾</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-sm overflow-hidden"
          role="menu"
        >
          {!user ? (
            <div className="p-2 grid gap-1">
              <Link
                href="/auth/login"
                className="rounded px-3 py-2 text-sm hover:bg-zinc-50 transition"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="rounded px-3 py-2 text-sm hover:bg-zinc-50 transition"
                onClick={() => setOpen(false)}
              >
                Create account
              </Link>
            </div>
          ) : (
            <div className="p-2">
              <div className="px-3 py-2 text-sm text-zinc-700">
                Signed in as
                <div className="font-medium text-[var(--brand-dark)] truncate">
                  {displayName}
                </div>
              </div>

              <Link
                href="/orders"
                className="block rounded px-3 py-2 text-sm hover:bg-zinc-50 transition"
                onClick={() => setOpen(false)}
              >
                My Orders
              </Link>

              <div className="my-1 h-px bg-zinc-100" />

              <button
                type="button"
                onClick={logout}
                disabled={busy}
                className="w-full text-left block rounded px-3 py-2 text-sm hover:bg-zinc-50 transition text-[var(--brand-dark)] disabled:opacity-50"
              >
                {busy ? "Logging out…" : "Logout"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}