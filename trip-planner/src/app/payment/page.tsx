"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function formatPrice(cents: number) {
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

  const nextUrl = useMemo(
    () => `/payment?${sp.toString()}`,
    [sp]
  );

  const summary = useMemo(() => {
    if (type === "bike") {
      return {
        title: "Bike Reservation",
        amount: 499,
        details: stationName || "Selected BIXI station",
      };
    }

    if (type === "parking") {
      return {
        title: "Parking Reservation",
        amount: 1299,
        details: name || "Selected parking location",
      };
    }

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

      const body =
        type === "bike"
          ? {
              type: "bike",
              stationId,
              stationName,
              cardName,
              cardNumber,
              expiry,
              cvv,
            }
          : {
              type: "parking",
              parkingId,
              name,
              address,
              lat: Number(lat),
              lon: Number(lon),
              cardName,
              cardNumber,
              expiry,
              cvv,
            };

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

  if (!summary) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="max-w-xl mx-auto rounded border bg-white p-6">
          <h1 className="text-2xl font-semibold">Invalid payment request</h1>
          <p className="mt-2 text-zinc-600">Missing reservation details.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Mock Payment</h1>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm text-zinc-500">Order summary</div>
          <div className="text-lg font-semibold">{summary.title}</div>
          <div className="text-zinc-700">{summary.details}</div>
          {type === "parking" && address ? (
            <div className="text-sm text-zinc-500">{address}</div>
          ) : null}
          <div className="pt-2 text-xl font-bold">{formatPrice(summary.amount)}</div>
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Cardholder name</div>
            <input
              className="w-full border rounded px-3 py-2 bg-white"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Card number</div>
            <input
              className="w-full border rounded px-3 py-2 bg-white"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4111 1111 1111 1111"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Expiry</div>
              <input
                className="w-full border rounded px-3 py-2 bg-white"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="12/27"
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">CVV</div>
              <input
                className="w-full border rounded px-3 py-2 bg-white"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
              />
            </div>
          </div>

          <button
            onClick={purchase}
            disabled={busy || success}
            className="w-full px-4 py-2 rounded bg-[var(--brand-green)] text-white disabled:opacity-50"
          >
            {busy ? "Processing..." : "Purchase"}
          </button>

          {msg && <div className="text-sm text-red-700">{msg}</div>}
        </div>

        {success && (
          <div className="rounded border bg-white p-8 flex flex-col items-center justify-center">
            <div className="h-20 w-20 rounded-full border-4 border-green-500 flex items-center justify-center animate-pulse">
              <span className="text-4xl text-green-600">✓</span>
            </div>
            <div className="mt-4 text-lg font-semibold text-green-700">
              Payment successful
            </div>
          </div>
        )}
      </div>
    </main>
  );
}