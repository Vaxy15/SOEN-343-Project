"use client";

import { useEffect, useMemo, useState } from "react";

type Metrics = {
  window: { days: number; from: string; to: string };
  totals: { tripPlans: number; bikeReservations: number; parkingReservations: number };
  active: { bikeReservations: number; parkingReservations: number; bikeStockAvailable: number };
  timeseries: { day: string; tripPlans: number; bikeReservations: number; parkingReservations: number }[];
  top: {
    stations: { stationId: string; stationName: string; count: number }[];
    parking: { parkingId: string; name: string; address: string; count: number }[];
  };
  recent: {
    tripPlans: { id: string; createdAt: string; origin: string; destination: string; mode: string }[];
    bikeReservations: { id: string; createdAt: string; stationId: string; stationName: string; userId: string }[];
    parkingReservations: { id: string; createdAt: string; parkingId: string; name: string; address: string; userId: string }[];
  };
  insights: { type: "info" | "warning" | "success"; title: string; detail: string }[];
};

function fmt(n: number) {
  return n.toLocaleString();
}

function badgeClass(t: "info" | "warning" | "success") {
  if (t === "warning") return "bg-yellow-100 text-yellow-900 border-yellow-200";
  if (t === "success") return "bg-green-100 text-green-900 border-green-200";
  return "bg-blue-100 text-blue-900 border-blue-200";
}

function MiniLineChart(props: {
  points: number[];
  width?: number;
  height?: number;
}) {
  const width = props.width ?? 320;
  const height = props.height ?? 90;
  const pts = props.points;

  const max = Math.max(1, ...pts);
  const min = Math.min(0, ...pts);
  const range = Math.max(1, max - min);

  const d = pts
    .map((v, i) => {
      const x = (i / Math.max(1, pts.length - 1)) * (width - 2) + 1;
      const y = height - 1 - ((v - min) / range) * (height - 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="w-full">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BarList(props: { items: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...props.items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {props.items.map((i) => {
        const pct = Math.round((i.value / max) * 100);
        return (
          <div key={i.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{i.label}</div>
                {i.sub ? <div className="text-xs text-zinc-500 truncate">{i.sub}</div> : null}
              </div>
              <div className="text-sm text-zinc-700">{i.value}</div>
            </div>
            <div className="h-2 rounded bg-zinc-100 overflow-hidden">
              <div className="h-2 bg-[var(--brand-blue)]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminClient() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/metrics?t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load metrics.");
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const tripSeries = useMemo(() => data?.timeseries.map((d) => d.tripPlans) ?? [], [data]);
  const bikeSeries = useMemo(() => data?.timeseries.map((d) => d.bikeReservations) ?? [], [data]);
  const parkSeries = useMemo(() => data?.timeseries.map((d) => d.parkingReservations) ?? [], [data]);

  const conversions = useMemo(() => {
    if (!data) return null;
    const last14Trips = data.timeseries.reduce((a, b) => a + b.tripPlans, 0);
    const last14Res = data.timeseries.reduce((a, b) => a + b.bikeReservations + b.parkingReservations, 0);
    const pct = last14Trips > 0 ? Math.round((last14Res / last14Trips) * 100) : 0;
    return { last14Trips, last14Res, pct };
  }, [data]);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <div className="text-sm text-zinc-600">
              Activity, reservations, and operational signals (last {data?.window.days ?? 14} days).
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a className="underline text-sm text-zinc-600" href="/admin/users">
              Admin approvals
            </a>
            <button
              onClick={load}
              className="px-3 py-1.5 rounded border bg-white hover:bg-zinc-100 text-sm"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-700 border rounded p-3 bg-red-50">
            {err}
            <div className="text-xs text-zinc-600 mt-1">
              If you see <span className="font-mono">Forbidden</span>, you’re not an approved admin.
            </div>
          </div>
        ) : null}

        {!data ? (
          <div className="rounded-xl border bg-white p-4">
            {loading ? "Loading dashboard…" : "No data."}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-zinc-500">Total trip plans</div>
                <div className="text-2xl font-semibold">{fmt(data.totals.tripPlans)}</div>
                <div className="text-xs text-zinc-500 mt-2">All time</div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-zinc-500">Bike reservations</div>
                <div className="text-2xl font-semibold">{fmt(data.totals.bikeReservations)}</div>
                <div className="text-xs text-zinc-500 mt-2">
                  Active now: {fmt(data.active.bikeReservations)}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-zinc-500">Parking reservations</div>
                <div className="text-2xl font-semibold">{fmt(data.totals.parkingReservations)}</div>
                <div className="text-xs text-zinc-500 mt-2">
                  Active now: {fmt(data.active.parkingReservations)}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-zinc-500">Bike stock available</div>
                <div className="text-2xl font-semibold">{fmt(data.active.bikeStockAvailable)}</div>
                <div className="text-xs text-zinc-500 mt-2">
                  {conversions ? `Last 14d conversion: ${conversions.pct}%` : ""}
                </div>
              </div>
            </div>

            {/* Trends + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-white p-4 lg:col-span-2 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">Trends (last 14 days)</div>
                    <div className="text-xs text-zinc-500">
                      Simple activity signal. Use bars below for “top” entities.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-zinc-500">Trip plans/day</div>
                    <div className="mt-2 text-[var(--brand-blue)]">
                      <MiniLineChart points={tripSeries} />
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-zinc-500">Bike reservations/day</div>
                    <div className="mt-2 text-[var(--brand-green)]">
                      <MiniLineChart points={bikeSeries} />
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-zinc-500">Parking reservations/day</div>
                    <div className="mt-2 text-zinc-900">
                      <MiniLineChart points={parkSeries} />
                    </div>
                  </div>
                </div>

                {conversions ? (
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium">Conversion signal</div>
                    <div className="text-sm text-zinc-700 mt-1">
                      Last 14 days: <span className="font-medium">{conversions.last14Trips}</span> trip plans →
                      <span className="font-medium"> {conversions.last14Res}</span> reservations (bike + parking) →
                      <span className="font-medium"> {conversions.pct}%</span> conversion.
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Action: if conversion is low, add “Reserve nearby bike/parking” CTAs directly on Planner results.
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border bg-white p-4 space-y-3">
                <div className="font-medium">Actionable insights</div>
                <div className="space-y-2">
                  {data.insights.map((i, idx) => (
                    <div key={idx} className={`border rounded-lg p-3 ${badgeClass(i.type)}`}>
                      <div className="text-sm font-medium">{i.title}</div>
                      <div className="text-sm mt-1">{i.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top entities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-white p-4 space-y-3">
                <div className="font-medium">Top BIXI stations (last 14 days)</div>
                {data.top.stations.length ? (
                  <BarList
                    items={data.top.stations.map((s) => ({
                      label: s.stationName,
                      value: s.count,
                      sub: `stationId: ${s.stationId}`,
                    }))}
                  />
                ) : (
                  <div className="text-sm text-zinc-600">No bike reservations in this period.</div>
                )}
              </div>

              <div className="rounded-xl border bg-white p-4 space-y-3">
                <div className="font-medium">Top parking locations (last 14 days)</div>
                {data.top.parking.length ? (
                  <BarList
                    items={data.top.parking.map((p) => ({
                      label: p.name,
                      value: p.count,
                      sub: p.address || `parkingId: ${p.parkingId}`,
                    }))}
                  />
                ) : (
                  <div className="text-sm text-zinc-600">No parking reservations in this period.</div>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-white p-4">
                <div className="font-medium mb-2">Recent trip plans</div>
                <div className="space-y-2">
                  {data.recent.tripPlans.map((t) => (
                    <div key={t.id} className="rounded border p-3">
                      <div className="text-sm font-medium">{t.origin} → {t.destination}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(t.createdAt).toLocaleString()} · mode: {t.mode}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="font-medium mb-2">Recent bike reservations</div>
                <div className="space-y-2">
                  {data.recent.bikeReservations.map((b) => (
                    <div key={b.id} className="rounded border p-3">
                      <div className="text-sm font-medium">{b.stationName}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(b.createdAt).toLocaleString()} · userId: {b.userId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="font-medium mb-2">Recent parking reservations</div>
                <div className="space-y-2">
                  {data.recent.parkingReservations.map((p) => (
                    <div key={p.id} className="rounded border p-3">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(p.createdAt).toLocaleString()} · userId: {p.userId}
                      </div>
                      {p.address ? <div className="text-xs text-zinc-600 mt-1">{p.address}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}