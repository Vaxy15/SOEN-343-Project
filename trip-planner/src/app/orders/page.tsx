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

function formatPrice(cents: number) {
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
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">My Orders</h1>

        {loading ? <div>Loading...</div> : null}
        {msg ? <div className="text-red-700">{msg}</div> : null}

        {!loading && !msg && orders.length === 0 ? (
          <div className="rounded border bg-white p-4 text-zinc-600">
            No orders yet.
          </div>
        ) : null}

        <div className="space-y-3">
          {orders.map((order) => {
            const details = JSON.parse(order.detailsJson || "{}");

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded border bg-white p-4 hover:bg-zinc-50 transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold capitalize">{order.type} order</div>
                    <div className="text-sm text-zinc-600">
                      {order.type === "bike"
                        ? details.stationName
                        : details.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold">{formatPrice(order.priceCents)}</div>
                    <div className="text-sm text-green-700">{order.status}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}