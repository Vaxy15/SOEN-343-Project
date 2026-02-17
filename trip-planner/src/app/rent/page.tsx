"use client";

import { useEffect, useMemo, useState } from "react";

type StationInfo = {
  station_id: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  capacity?: number;
};

type StationStatusRaw = {
  station_id: string;
  num_bikes_available?: number;
  num_docks_available?: number;
  is_installed?: number;
  is_renting?: number;
  is_returning?: number;
};

type Row = StationInfo & {
  bikes_available: number;
  docks_available: number;
  is_installed: number;
  is_renting: number;
  is_returning: number;
};

async function fetchGbfsJson(): Promise<any> {
  const gbfsUrl = "https://gbfs.velobixi.com/gbfs/2-2/gbfs.json";
  const res = await fetch(gbfsUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load gbfs.json`);
  return res.json();
}

function pickFeedUrl(gbfs: any, key: string): string | null {
  const preferred = gbfs?.data?.en ?? gbfs?.data?.fr;
  const feeds = preferred?.feeds ?? [];
  const found = feeds.find((f: any) => f?.name === key);
  return found?.url ?? null;
}

export default function RentBikePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const gbfs = await fetchGbfsJson();
        const infoUrl = pickFeedUrl(gbfs, "station_information");
        const statusUrl = pickFeedUrl(gbfs, "station_status");

        if (!infoUrl || !statusUrl) {
          throw new Error("Missing GBFS feeds");
        }

        const [infoRes, statusRes] = await Promise.all([
          fetch(infoUrl, { cache: "no-store" }),
          fetch(statusUrl, { cache: "no-store" }),
        ]);

        const infoJson = await infoRes.json();
        const statusJson = await statusRes.json();

        const infoStations: StationInfo[] = infoJson?.data?.stations ?? [];
        const statusStations: StationStatusRaw[] = statusJson?.data?.stations ?? [];

        const statusById = new Map(
          statusStations.map((s) => [String(s.station_id), s])
        );

        const merged: Row[] = infoStations.map((s) => {
          const st = statusById.get(String(s.station_id));

          return {
            ...s,
            bikes_available: st?.num_bikes_available ?? 0,
            docks_available: st?.num_docks_available ?? 0,
            is_installed: st?.is_installed ?? 0,
            is_renting: st?.is_renting ?? 0,
            is_returning: st?.is_returning ?? 0,
          };
        });

        merged.sort((a, b) => b.bikes_available - a.bikes_available);

        if (!cancelled) setRows(merged);
      } catch (e: any) {
        if (!cancelled) setErr("Failed to load stations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(qq) ||
      r.station_id.includes(qq)
    );
  }, [rows, q]);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Reserve a Bike (BIXI)
          </h1>
          <a className="underline text-sm text-zinc-600" href="/">
            Home
          </a>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-600">
              Live station availability
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search station…"
              className="border rounded px-3 py-2 text-sm w-[280px]"
            />
          </div>

          {loading ? (
            <div className="text-sm text-zinc-600">Loading stations…</div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-zinc-900">
                <thead className="text-left text-zinc-600 border-b">
                  <tr>
                    <th className="py-2">Station</th>
                    <th className="py-2">Bikes</th>
                    <th className="py-2">Docks</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const canRent =
                      s.is_installed === 1 &&
                      s.is_renting === 1 &&
                      s.bikes_available > 0;

                    return (
                      <tr key={s.station_id} className="border-b">
                        <td className="py-2 font-medium">{s.name}</td>
                        <td className="py-2">{s.bikes_available}</td>
                        <td className="py-2">{s.docks_available}</td>
                        <td className="py-2 text-xs text-zinc-600">
                          {s.is_installed ? "Installed" : "Not installed"} ·{" "}
                          {s.is_renting ? "Renting" : "Not renting"} ·{" "}
                          {s.is_returning ? "Returning" : "Not returning"}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            disabled={!canRent}
                            className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-40"
                          >
                            Rent
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-3 text-xs text-zinc-500">
                Showing {filtered.length} / {rows.length} stations
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
