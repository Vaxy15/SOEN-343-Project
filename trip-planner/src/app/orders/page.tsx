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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        const json = await res.json();
        if (res.status === 401) {
          window.location.href = `/auth/login?next=${encodeURIComponent("/orders")}`;
          return;
        }
        if (!res.ok) throw new Error(json?.error ?? "Failed to load orders.");
        setOrders(json.orders ?? []);
      } catch (e: any) {
        setMsg(e?.message ?? "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Orders</h1>
        <p className="text-sm text-slate-500 mt-1">Your reservation history</p>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-sm">
          Loading orders…
        </div>
      )}

      {msg && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">{msg}</div>
      )}

      {!loading && !msg && orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center space-y-3">
          <div className="text-4xl">🧾</div>
          <div className="font-semibold text-slate-700">No orders yet</div>
          <p className="text-sm text-slate-400">Reserve a bike or parking spot to get started</p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/rent" className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition">Reserve a Bike</Link>
            <Link href="/parking" className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition">Find Parking</Link>
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {orders.map((order) => {
              const details = JSON.parse(order.detailsJson || "{}");
              const label = order.type === "bike" ? details.stationName : details.name;
              const emoji = order.type === "bike" ? "🚲" : "🅿️";
              const tagColor = order.type === "bike"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-blue-50 text-blue-700 border-blue-100";

              return (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/80 transition group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border ${tagColor} shrink-0`}>
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">{label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}
                        <span className={`inline-block px-1.5 py-0.5 rounded-md text-xs border font-medium ${tagColor}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="font-bold text-slate-800">{fmt(order.priceCents)}</span>
                    <span className="text-slate-300 group-hover:text-slate-400 transition">›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}