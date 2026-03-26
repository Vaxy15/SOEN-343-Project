"use client";

import { useEffect, useState } from "react";

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

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  if (msg) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="max-w-2xl mx-auto text-red-700">{msg}</div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="max-w-2xl mx-auto">Loading...</div>
      </main>
    );
  }

  const details = JSON.parse(order.detailsJson || "{}");

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Order Summary</h1>

        <div className="rounded border bg-white p-6 space-y-3">
          <div>
            <div className="text-sm text-zinc-500">Order ID</div>
            <div className="font-mono text-sm">{order.id}</div>
          </div>

          <div>
            <div className="text-sm text-zinc-500">Type</div>
            <div className="capitalize">{order.type}</div>
          </div>

          <div>
            <div className="text-sm text-zinc-500">Status</div>
            <div className="text-green-700 font-medium">{order.status}</div>
          </div>

          <div>
            <div className="text-sm text-zinc-500">Amount</div>
            <div className="font-semibold">{formatPrice(order.priceCents)}</div>
          </div>

          <div>
            <div className="text-sm text-zinc-500">Purchased on</div>
            <div>{new Date(order.createdAt).toLocaleString()}</div>
          </div>

          {order.type === "bike" ? (
            <div>
              <div className="text-sm text-zinc-500">Station</div>
              <div>{details.stationName}</div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-sm text-zinc-500">Parking</div>
                <div>{details.name}</div>
              </div>
              {details.address ? (
                <div>
                  <div className="text-sm text-zinc-500">Address</div>
                  <div>{details.address}</div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}