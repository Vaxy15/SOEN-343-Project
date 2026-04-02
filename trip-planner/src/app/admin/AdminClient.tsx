"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

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

function shortDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const COLORS = {
  trips: "#6366f1",
  bikes: "#10b981",
  parking: "#f59e0b",
};

function StatCard({
  label,
  value,
  sub,
  gradient,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white ${gradient} shadow-md flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium opacity-80">{label}</div>
        <div className="opacity-70 text-xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  );
}

function InsightBadge({
  type,
  title,
  detail,
}: {
  type: "info" | "warning" | "success";
  title: string;
  detail: string;
}) {
  const styles = {
    info: "bg-indigo-50 border-indigo-200 text-indigo-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  };
  const dot = {
    info: "bg-indigo-400",
    warning: "bg-amber-400",
    success: "bg-emerald-400",
  };

  return (
    <div className={`border rounded-xl p-3 ${styles[type]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-block w-2 h-2 rounded-full ${dot[type]}`} />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="text-xs opacity-80 pl-4">{detail}</div>
    </div>
  );
}

function TopList({
  items,
}: {
  items: { label: string; value: number; sub?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-zinc-400 w-4">#{i + 1}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-800 truncate">{item.label}</div>
                {item.sub && <div className="text-xs text-zinc-400 truncate">{item.sub}</div>}
              </div>
            </div>
            <span className="text-sm font-semibold text-zinc-700 shrink-0">{item.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-3 text-xs">
      <div className="font-semibold text-zinc-700 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-zinc-600 capitalize">{p.name}:</span>
          <span className="font-semibold text-zinc-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

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

  const chartData = useMemo(
    () =>
      data?.timeseries.map((d) => ({
        day: shortDay(d.day),
        "Trip Plans": d.tripPlans,
        "Bike Reservations": d.bikeReservations,
        "Parking Reservations": d.parkingReservations,
      })) ?? [],
    [data]
  );

  const conversionRate = useMemo(() => {
    if (!data) return null;
    const trips = data.timeseries.reduce((a, b) => a + b.tripPlans, 0);
    const res = data.timeseries.reduce(
      (a, b) => a + b.bikeReservations + b.parkingReservations,
      0
    );
    return trips > 0 ? Math.round((res / trips) * 100) : 0;
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 text-zinc-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Activity overview · last {data?.window.days ?? 14} days
            </p>
          </div>

          {/* ✅ Fixed: inline anchor tags to avoid parser error on multiline > */}
          <div className="flex items-center gap-3">
            <a href="/admin/users" className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2">Admin approvals</a>
            <a href="/admin/vehicles" className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2">Vehicles</a>
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm disabled:opacity-50 transition"
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </div>

        {err && (
          <div className="text-sm text-red-700 border border-red-200 rounded-xl p-3 bg-red-50">
            {err}
            <div className="text-xs text-zinc-500 mt-1">
              If you see <span className="font-mono">Forbidden</span>, you&apos;re not an approved admin.
            </div>
          </div>
        )}

        {!data ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-zinc-400">
            {loading ? "Loading dashboard…" : "No data available."}
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Trip Plans"
                value={fmt(data.totals.tripPlans)}
                sub="All time"
                gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
                icon="🗺️"
              />
              <StatCard
                label="Bike Reservations"
                value={fmt(data.totals.bikeReservations)}
                sub={`${fmt(data.active.bikeReservations)} active · ${fmt(data.active.bikeStockAvailable)} in stock`}
                gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                icon="🚲"
              />
              <StatCard
                label="Parking Reservations"
                value={fmt(data.totals.parkingReservations)}
                sub={`${fmt(data.active.parkingReservations)} active`}
                gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                icon="🅿️"
              />
              <StatCard
                label="Conversion Rate"
                value={`${conversionRate ?? 0}%`}
                sub="Trip plans → bookings (last 14d)"
                gradient="bg-gradient-to-br from-pink-500 to-rose-600"
                icon="📈"
              />
            </div>

            {/* Area Chart */}
            <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
              <div className="mb-4">
                <div className="font-semibold text-zinc-800 text-lg">Activity Trends</div>
                <div className="text-xs text-zinc-400">Daily breakdown over the last 14 days</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.trips} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COLORS.trips} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBikes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.bikes} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COLORS.bikes} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorParking" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.parking} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COLORS.parking} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="Trip Plans" stroke={COLORS.trips} strokeWidth={2} fill="url(#colorTrips)" dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Bike Reservations" stroke={COLORS.bikes} strokeWidth={2} fill="url(#colorBikes)" dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Parking Reservations" stroke={COLORS.parking} strokeWidth={2} fill="url(#colorParking)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
                <div className="mb-4">
                  <div className="font-semibold text-zinc-800 text-lg">Daily Comparison</div>
                  <div className="text-xs text-zinc-400">Reservations vs trip plans per day</div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} iconType="circle" iconSize={8} />
                    <Bar dataKey="Trip Plans" fill={COLORS.trips} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Bike Reservations" fill={COLORS.bikes} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Parking Reservations" fill={COLORS.parking} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6 space-y-3">
                <div className="font-semibold text-zinc-800 text-lg">Insights</div>
                {data.insights.length === 0 ? (
                  <div className="text-sm text-zinc-400">No insights available.</div>
                ) : (
                  data.insights.map((i, idx) => (
                    <InsightBadge key={idx} type={i.type} title={i.title} detail={i.detail} />
                  ))
                )}
              </div>
            </div>

            {/* Top Stations + Parking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
                <div className="mb-4">
                  <div className="font-semibold text-zinc-800 text-lg">Top BIXI Stations</div>
                  <div className="text-xs text-zinc-400">Most reserved in the last 14 days</div>
                </div>
                {data.top.stations.length ? (
                  <TopList
                    items={data.top.stations.map((s) => ({
                      label: s.stationName,
                      value: s.count,
                      sub: `ID: ${s.stationId}`,
                    }))}
                  />
                ) : (
                  <div className="text-sm text-zinc-400">No bike reservations in this period.</div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
                <div className="mb-4">
                  <div className="font-semibold text-zinc-800 text-lg">Top Parking Locations</div>
                  <div className="text-xs text-zinc-400">Most reserved in the last 14 days</div>
                </div>
                {data.top.parking.length ? (
                  <TopList
                    items={data.top.parking.map((p) => ({
                      label: p.name,
                      value: p.count,
                      sub: p.address || `ID: ${p.parkingId}`,
                    }))}
                  />
                ) : (
                  <div className="text-sm text-zinc-400">No parking reservations in this period.</div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  <div className="font-semibold text-zinc-800">Recent Trip Plans</div>
                </div>
                <div className="space-y-2">
                  {data.recent.tripPlans.length === 0 ? (
                    <div className="text-sm text-zinc-400">None yet.</div>
                  ) : (
                    data.recent.tripPlans.map((t) => (
                      <div key={t.id} className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2">
                        <div className="text-sm font-medium text-zinc-800 truncate">
                          {t.origin} → {t.destination}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {new Date(t.createdAt).toLocaleString()} · {t.mode}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <div className="font-semibold text-zinc-800">Recent Bike Reservations</div>
                </div>
                <div className="space-y-2">
                  {data.recent.bikeReservations.length === 0 ? (
                    <div className="text-sm text-zinc-400">None yet.</div>
                  ) : (
                    data.recent.bikeReservations.map((b) => (
                      <div key={b.id} className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2">
                        <div className="text-sm font-medium text-zinc-800 truncate">{b.stationName}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {new Date(b.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <div className="font-semibold text-zinc-800">Recent Parking Reservations</div>
                </div>
                <div className="space-y-2">
                  {data.recent.parkingReservations.length === 0 ? (
                    <div className="text-sm text-zinc-400">None yet.</div>
                  ) : (
                    data.recent.parkingReservations.map((p) => (
                      <div key={p.id} className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2">
                        <div className="text-sm font-medium text-zinc-800 truncate">{p.name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {new Date(p.createdAt).toLocaleString()}
                        </div>
                        {p.address && (
                          <div className="text-xs text-zinc-400 truncate">{p.address}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
