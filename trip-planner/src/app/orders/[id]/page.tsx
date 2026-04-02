"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Order = {
  id: string;
  createdAt: string;
  type: string;
  priceCents: number;
  status: string;
  detailsJson: string;
};

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { id } = await params;
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (res.status === 401) {
          window.location.href = `/auth/login?next=${encodeURIComponent(`/orders/${id}`)}`;
          return;
        }
        if (!res.ok) throw new Error(json?.error ?? "Failed to load order.");
        setOrder(json.order);
      } catch (e: any) {
        setMsg(e?.message ?? "Failed to load order.");
      }
    })();
  }, [params]);

  if (msg) return (
    <div className="max-w-lg mx-auto pt-8">
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 text-sm">{msg}</div>
    </div>
  );

  if (!order) return (
    <div className="max-w-lg mx-auto pt-8">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-sm">Loading…</div>
    </div>
  );

  const details = JSON.parse(order.detailsJson || "{}");
  const isBike = order.type === "bike";
  const emoji = isBike ? "🚲" : "🅿️";
  const tagColor = isBike
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-blue-50 text-blue-700 border-blue-100";

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-700 transition">← Orders</Link>
      </div>

      {/* Receipt card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Top banner */}
        <div className={`px-6 py-5 border-b border-slate-100 flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${tagColor}`}>
            {emoji}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-lg capitalize">{order.type} Reservation</div>
            <div className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold border mt-0.5 ${tagColor}`}>
              {order.status}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-slate-800">{fmt(order.priceCents)}</div>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-4">
          <Row label="Order ID" value={<span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg">{order.id}</span>} />
          <Row label="Date" value={new Date(order.createdAt).toLocaleString()} />
          {isBike ? (
            <Row label="Station" value={details.stationName} />
          ) : (
            <>
              <Row label="Location" value={details.name} />
              {details.address && <Row label="Address" value={details.address} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-700 transition font-medium">
            ← Back to orders
          </Link>
          <Link href={isBike ? "/rent" : "/parking"}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition">
            Book again
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm text-slate-500 shrink-0">{label}</div>
      <div className="text-sm font-medium text-slate-800 text-right">{value}</div>
    </div>
  );
}
