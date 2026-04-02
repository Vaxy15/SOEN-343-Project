"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type CarbonEquivalents = {
  kmNotDriven: number;
  phoneCharges: number;
  treeDays: number;
};

type Carbon = {
  bikeTrips: number;
  attributedTransitTrips: number;
  bikeSavingsGrams: number;
  transitSavingsGrams: number;
  totalSavingsGrams: number;
  formatted: string;
  equivalents: CarbonEquivalents;
};

type Stats = {
  user: { id: string; email: string; name: string | null };
  allTime: { spentCents: number; bikes: number; parking: number; total: number };
  recentWindow: { label: string; spentCents: number; bikes: number; parking: number };
  favourites: {
    station: { name: string; count: number } | null;
    parking: { name: string; count: number } | null;
  };
  activeReservations: {
    bike: { stationName: string; stationId: string } | null;
    parking: { name: string; parkingId: string } | null;
  };
  chart: { day: string; Bikes: number; Parking: number }[];
  recent: { id: string; type: string; priceCents: number; createdAt: string; label: string }[];
  carbon: Carbon;
};

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function StatCard({
  emoji,
  label,
  value,
  sub,
  bg,
}: {
  emoji: string;
  label: string;
  value: string | number;
  sub?: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${bg} flex flex-col gap-2`}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-2xl font-bold text-zinc-800 tracking-tight">{value}</div>
      <div className="text-sm font-medium text-zinc-700">{label}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-3 text-xs">
      <div className="font-semibold text-zinc-600 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-600">{p.name}:</span>
          <span className="font-bold text-zinc-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function CarbonBar({
  label,
  grams,
  maxGrams,
  color,
}: {
  label: string;
  grams: number;
  maxGrams: number;
  color: string;
}) {
  const pct = maxGrams > 0 ? Math.round((grams / maxGrams) * 100) : 0;
  const kg = (grams / 1000).toFixed(2);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-zinc-600">
        <span>{label}</span>
        <span>{kg} kg CO₂</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CarbonCard({ carbon }: { carbon: Carbon }) {
  const {
    equivalents,
    formatted,
    totalSavingsGrams,
    bikeTrips,
    attributedTransitTrips,
    bikeSavingsGrams,
    transitSavingsGrams,
  } = carbon;
  const hasActivity = totalSavingsGrams > 0;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-1">
            🌿 Carbon footprint
          </div>
          <div className="text-3xl font-bold text-emerald-800 tracking-tight">
            {hasActivity ? `${formatted} CO₂ saved` : "No trips yet"}
          </div>
          <div className="text-sm text-emerald-600 mt-1">
            vs. driving a car for every trip
          </div>
        </div>
        <div className="text-4xl select-none">🌍</div>
      </div>

      {hasActivity ? (
        <>
          <div className="space-y-3">
            <CarbonBar
              label={`🚲 ${bikeTrips} BIXI trip${bikeTrips !== 1 ? "s" : ""}`}
              grams={bikeSavingsGrams}
              maxGrams={totalSavingsGrams}
              color="bg-emerald-500"
            />
            {attributedTransitTrips > 0 && (
              <CarbonBar
                label={`🚌 ~${attributedTransitTrips} transit trip${attributedTransitTrips !== 1 ? "s" : ""} (estimated)`}
                grams={transitSavingsGrams}
                maxGrams={totalSavingsGrams}
                color="bg-teal-400"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/70 border border-emerald-100 p-3 text-center">
              <div className="text-lg font-bold text-emerald-700">
                {equivalents.kmNotDriven}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">km not driven</div>
            </div>
            <div className="rounded-xl bg-white/70 border border-emerald-100 p-3 text-center">
              <div className="text-lg font-bold text-emerald-700">
                {equivalents.phoneCharges}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">📱 charges offset</div>
            </div>
            <div className="rounded-xl bg-white/70 border border-emerald-100 p-3 text-center">
              <div className="text-lg font-bold text-emerald-700">
                {equivalents.treeDays}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">🌳 tree-days</div>
            </div>
          </div>

          <p className="text-xs text-emerald-600/70">
            Based on 170 g CO₂/km for cars · 0 g for bikes · 45 g for STM transit ·
            avg. BIXI trip 2.5 km · avg. transit trip 6 km (ARTM 2023)
          </p>
        </>
      ) : (
        <div className="text-sm text-emerald-700 bg-white/60 rounded-xl p-4 text-center">
          Reserve a bike or plan a trip to start tracking your carbon savings.
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/stats", { cache: "no-store" });
        const json = await res.json();
        if (res.status === 401) {
          router.replace("/auth/login?next=/account");
          return;
        }
        if (!res.ok) throw new Error(json?.error ?? "Failed to load stats.");
        setStats(json);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm">
        Loading your stats…
      </div>
    );
  }

  if (err || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-sm">
        {err ?? "Something went wrong."}
      </div>
    );
  }

  const hasActivity = stats.allTime.total > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-pink-50/40 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-800 tracking-tight">
              Hey, {stats.user.name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{stats.user.email}</p>
          </div>
          <Link href="/orders" className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
            View all orders →
          </Link>
        </div>

        {/* Active reservations banner */}
        {(stats.activeReservations.bike || stats.activeReservations.parking) && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 p-4 text-white flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-2xl">🎟️</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">You have active reservations</div>
              <div className="text-xs opacity-90 mt-0.5 space-y-0.5">
                {stats.activeReservations.bike && (
                  <div>🚲 Bike at {stats.activeReservations.bike.stationName}</div>
                )}
                {stats.activeReservations.parking && (
                  <div>🅿️ Parking at {stats.activeReservations.parking.name}</div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {stats.activeReservations.bike && (
                <Link href="/rent" className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition">
                  Manage bike
                </Link>
              )}
              {stats.activeReservations.parking && (
                <Link href="/parking" className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition">
                  Manage parking
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Recent window strip */}
        <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 p-5 text-white">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-3">
            {stats.recentWindow.label}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{fmt(stats.recentWindow.spentCents)}</div>
              <div className="text-xs opacity-70 mt-1">Spent</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.recentWindow.bikes}</div>
              <div className="text-xs opacity-70 mt-1">Bikes</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.recentWindow.parking}</div>
              <div className="text-xs opacity-70 mt-1">Parking</div>
            </div>
          </div>
        </div>

        {/* All-time stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard emoji="💸" label="Total spent" value={fmt(stats.allTime.spentCents)} sub="All time" bg="bg-amber-50 border border-amber-100" />
          <StatCard emoji="🚲" label="Bikes reserved" value={stats.allTime.bikes} sub="All time" bg="bg-emerald-50 border border-emerald-100" />
          <StatCard emoji="🅿️" label="Parking booked" value={stats.allTime.parking} sub="All time" bg="bg-sky-50 border border-sky-100" />
          <StatCard emoji="🧾" label="Total orders" value={stats.allTime.total} sub="All time" bg="bg-pink-50 border border-pink-100" />
        </div>

        {/* Carbon footprint card */}
        <CarbonCard carbon={stats.carbon} />

        {/* Activity chart */}
        {hasActivity ? (
          <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
            <div className="mb-4">
              <div className="font-bold text-zinc-800 text-lg">Your activity</div>
              <div className="text-xs text-zinc-400">
                Reservations over {stats.recentWindow.label}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.chart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} iconType="circle" iconSize={8} />
                <Bar dataKey="Bikes" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Parking" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <div className="font-semibold text-zinc-700">No activity yet</div>
            <div className="text-sm text-zinc-400 mt-1">Reserve a bike or parking spot to get started</div>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/rent" className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:opacity-90 transition">Reserve a Bike</Link>
              <Link href="/parking" className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:opacity-90 transition">Find Parking</Link>
            </div>
          </div>
        )}

        {/* Favourites */}
        {(stats.favourites.station || stats.favourites.parking) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.favourites.station && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex items-start gap-3">
                <div className="text-2xl">⭐</div>
                <div>
                  <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Favourite BIXI station</div>
                  <div className="font-bold text-zinc-800 mt-0.5">{stats.favourites.station.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Reserved {stats.favourites.station.count}× total</div>
                </div>
              </div>
            )}
            {stats.favourites.parking && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 flex items-start gap-3">
                <div className="text-2xl">⭐</div>
                <div>
                  <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Favourite parking</div>
                  <div className="font-bold text-zinc-800 mt-0.5">{stats.favourites.parking.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Booked {stats.favourites.parking.count}× total</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent orders */}
        {stats.recent.length > 0 && (
          <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-zinc-800 text-lg">Recent orders</div>
              <Link href="/orders" className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2">See all</Link>
            </div>
            <div className="space-y-2">
              {stats.recent.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 hover:bg-zinc-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{o.type === "bike" ? "🚲" : "🅿️"}</span>
                    <div>
                      <div className="text-sm font-medium text-zinc-800">{o.label}</div>
                      <div className="text-xs text-zinc-400">
                        {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-zinc-700">{fmt(o.priceCents)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}