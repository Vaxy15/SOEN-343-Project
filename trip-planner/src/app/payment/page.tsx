"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PaymentPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const type = sp.get("type");
  const stationId = sp.get("stationId") ?? "";
  const stationName = sp.get("stationName") ?? "";
  const parkingId = sp.get("parkingId") ?? "";
  const name = sp.get("name") ?? "";
  const address = sp.get("address") ?? "";
  const lat = sp.get("lat") ?? "";
  const lon = sp.get("lon") ?? "";

  const nextUrl = useMemo(() => `/payment?${sp.toString()}`, [sp]);

  const summary = useMemo(() => {
    if (type === "bike") return { title: "Bike Reservation", amount: 499, detail: stationName || "Selected BIXI station", emoji: "🚲" };
    if (type === "parking") return { title: "Parking Reservation", amount: 1299, detail: name || "Selected parking location", emoji: "🅿️" };
    return null;
  }, [type, stationName, name]);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function purchase() {
    setMsg(null);
    setBusy(true);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meJson = await meRes.json();
      if (!meJson?.user) {
        router.replace(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
        return;
      }

      const body = type === "bike"
        ? { type: "bike", stationId, stationName, cardName, cardNumber, expiry, cvv }
        : { type: "parking", parkingId, name, address, lat: Number(lat), lon: Number(lon), cardName, cardNumber, expiry, cvv };

      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Purchase failed.");

      setSuccess(true);
      setTimeout(() => {
        router.replace(`/orders/${json.orderId}`);
        router.refresh();
      }, 1400);
    } catch (e: any) {
      setMsg(e?.message ?? "Purchase failed.");
      setBusy(false);
    }
  }

  if (!summary) return (
    <div className="max-w-lg mx-auto pt-8">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-2">
        <div className="text-3xl">⚠️</div>
        <div className="font-semibold text-slate-700">Invalid payment request</div>
        <p className="text-sm text-slate-400">Missing reservation details.</p>
      </div>
    </div>
  );

  const accentColor = type === "bike" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-500 hover:bg-blue-600";
  const softColor = type === "bike" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-blue-50 border-blue-100 text-blue-700";

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Checkout</h1>
        <p className="text-sm text-slate-500 mt-1">Complete your reservation</p>
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Order summary</div>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${softColor}`}>
            {summary.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-800">{summary.title}</div>
            <div className="text-sm text-slate-500 truncate">{summary.detail}</div>
            {type === "parking" && address && <div className="text-xs text-slate-400 truncate">{address}</div>}
          </div>
          <div className="text-2xl font-bold text-slate-800 shrink-0">{fmt(summary.amount)}</div>
        </div>
      </div>

      {/* Payment form */}
      {!success ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment details</div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Cardholder name</label>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Jane Doe" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Card number</label>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition font-mono"
              value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4111 1111 1111 1111" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Expiry</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition font-mono"
                value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="12/27" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">CVV</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition font-mono"
                value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" />
            </div>
          </div>

          {msg && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">{msg}</div>
          )}

          <button onClick={purchase} disabled={busy}
            className={`w-full py-3 rounded-xl text-white font-semibold text-sm shadow-sm disabled:opacity-50 transition ${accentColor}`}>
            {busy ? "Processing…" : `Pay ${fmt(summary.amount)}`}
          </button>

          <p className="text-center text-xs text-slate-400">🔒 This is a mock payment — no real charges apply</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto animate-bounce">
            <span className="text-2xl">✅</span>
          </div>
          <div className="font-bold text-slate-800 text-lg">Payment confirmed!</div>
          <p className="text-sm text-slate-400">Redirecting to your order…</p>
        </div>
      )}
    </div>
  );
}