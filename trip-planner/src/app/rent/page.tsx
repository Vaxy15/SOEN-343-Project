"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GoogleLoader from "../planner/GoogleLoader";
import { useRouter } from "next/navigation";
import type { GbfsStation } from "@/lib/providers/gbfs";

type Row = GbfsStation;
type BikeStatus = {
  available: number | null;
  reservation: null | { id: string; stationId: string; stationName: string; createdAt: string };
  user: null | { id: string; email: string; name: string | null };
};

declare global { interface Window { google?: any } }
function toLatLng(p: { lat: number; lon: number }) { return { lat: p.lat, lng: p.lon }; }

export default function RentBikePage() {
  const router = useRouter();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [stationsErr, setStationsErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [bikeStatus, setBikeStatus] = useState<BikeStatus | null>(null);
  const [reserveErr, setReserveErr] = useState<string | null>(null);
  const [reserveBusy, setReserveBusy] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const didFitRef = useRef(false);

  async function loadBikeStatus() {
    const res = await fetch("/api/bikes/status", { cache: "no-store" });
    setBikeStatus((await res.json()) as BikeStatus);
  }

  async function loadStations() {
    setLoadingStations(true);
    setStationsErr(null);
    try {
      const res = await fetch("/api/bikes/stations", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load stations.");
      const stations = (json?.stations ?? []) as Row[];
      setRows(stations);
      setSelected((prev) => prev ? stations.find((s) => s.station_id === prev.station_id) ?? stations[0] ?? null : stations[0] ?? null);
    } catch (e: any) {
      setStationsErr(e?.message ?? "Failed to load stations.");
    } finally {
      setLoadingStations(false);
    }
  }

  useEffect(() => { loadBikeStatus(); loadStations(); }, []);

  async function reserveBike(stationId: string, stationName: string) {
    setReserveBusy(true);
    try {
      router.push(`/payment?type=bike&stationId=${encodeURIComponent(stationId)}&stationName=${encodeURIComponent(stationName)}`);
    } finally {
      setReserveBusy(false);
    }
  }

  async function returnBike() {
    setReserveBusy(true);
    setReserveErr(null);
    try {
      const res = await fetch("/api/bikes/return", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to return bike.");
      await Promise.all([loadBikeStatus(), loadStations()]);
    } catch (e: any) {
      setReserveErr(e?.message ?? "Failed to return bike.");
    } finally {
      setReserveBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((s) => s.name.toLowerCase().includes(needle) || s.station_id.toLowerCase().includes(needle));
  }, [rows, q]);

  const loggedIn = !!bikeStatus?.user;
  const hasReservation = !!bikeStatus?.reservation;

  useEffect(() => {
    if (!googleReady || !window.google?.maps || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: { lat: 45.5019, lng: -73.5674 },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [googleReady]);

  useEffect(() => {
    if (!googleReady || !mapRef.current || !window.google?.maps) return;
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];
    for (const s of filtered) {
      const marker = new window.google.maps.Marker({ map: mapRef.current, position: toLatLng(s), title: s.name });
      marker.addListener("click", () => {
        setSelected(s);
        setReserveErr(null);
        mapRef.current?.panTo(toLatLng(s));
        if ((mapRef.current?.getZoom?.() ?? 12) < 15) mapRef.current?.setZoom?.(15);
      });
      markersRef.current.push(marker);
    }
    if (!didFitRef.current && q.trim() === "" && filtered.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      for (const s of filtered) bounds.extend(toLatLng(s));
      mapRef.current.fitBounds(bounds, 60);
      didFitRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, filtered]);

  const selectedHasBike = !!selected && selected.is_installed === 1 && selected.is_renting === 1 && (selected.bikes_available ?? 0) > 0;
  const canReserveSelected = selectedHasBike && !hasReservation && !reserveBusy;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reserve a Bike</h1>
        <p className="text-sm text-slate-500 mt-1">Live BIXI station availability across Montréal</p>
      </div>

      <GoogleLoader onReady={(ok) => { setGoogleReady(ok); setGoogleError(ok ? null : "Google Maps failed to load."); }} />
      {googleError && <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">{googleError}</div>}

      {/* Reservation status */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reservation status</div>
            {!loggedIn ? (
              <p className="text-sm text-slate-500">Log in to reserve a bike</p>
            ) : hasReservation ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-800">{bikeStatus?.reservation?.stationName}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active reservation</p>
            )}
          </div>
          {loggedIn && hasReservation && (
            <button onClick={returnBike} disabled={reserveBusy}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition disabled:opacity-50">
              Return Bike
            </button>
          )}
        </div>
        {reserveErr && <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{reserveErr}</div>}
      </div>

      {/* Map + list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-500">
            {loadingStations ? "Loading stations…" : stationsErr ? "Error loading stations" : `${filtered.length} of ${rows.length} stations`}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search station…"
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
        </div>

        {stationsErr && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{stationsErr}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div ref={mapDivRef} className="h-[60vh] lg:h-[520px] w-full rounded-xl border border-slate-100" />
          </div>

          <div className="hidden lg:flex flex-col">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 h-[520px] overflow-auto">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Station details</div>
              {!selected ? (
                <p className="text-sm text-slate-500">Click a marker to view details</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-slate-800">{selected.name}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-center">
                        <div className="text-xl font-bold text-emerald-600">{selected.bikes_available}</div>
                        <div className="text-xs text-slate-400">bikes</div>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="text-center">
                        <div className="text-xl font-bold text-slate-700">{selected.docks_available}</div>
                        <div className="text-xs text-slate-400">docks</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {selected.is_installed ? <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg">Installed</span> : null}
                      {selected.is_renting ? <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg">Renting</span> : null}
                      {selected.is_returning ? <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">Returning</span> : null}
                    </div>
                  </div>
                  <button disabled={!canReserveSelected} onClick={() => reserveBike(selected.station_id, selected.name)}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition disabled:opacity-50">
                    {!selectedHasBike ? "No bikes available" : hasReservation ? "Already reserved" : reserveBusy ? "Loading…" : "Reserve"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2.5 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Station</th>
                <th className="text-left py-2.5 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bikes</th>
                <th className="text-left py-2.5 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Docks</th>
                <th className="text-right py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const hasBike = s.is_installed === 1 && s.is_renting === 1 && (s.bikes_available ?? 0) > 0;
                const canReserve = hasBike && !hasReservation && !reserveBusy;
                return (
                  <tr key={s.station_id} onClick={() => setSelected(s)} className={`border-b border-slate-50 cursor-pointer transition ${selected?.station_id === s.station_id ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                    <td className="py-2.5 pr-3 font-medium text-slate-800">{s.name}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`font-semibold ${hasBike ? "text-emerald-600" : "text-slate-400"}`}>{s.bikes_available}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{s.docks_available}</td>
                    <td className="py-2.5 text-right">
                      <button disabled={!canReserve} onClick={(e) => { e.stopPropagation(); reserveBike(s.station_id, s.name); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition disabled:opacity-40">
                        {hasBike ? hasReservation ? "Reserved" : "Reserve" : "No bikes"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className={`lg:hidden fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ${selected ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Station</div>
                <div className="font-semibold text-slate-800">{selected?.name}</div>
                {selected && (
                  <div className="text-sm text-slate-500 mt-0.5">
                    <span className="text-emerald-600 font-semibold">{selected.bikes_available}</span> bikes · {selected.docks_available} docks
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition">✕</button>
            </div>
            <button disabled={!canReserveSelected} onClick={() => selected && reserveBike(selected.station_id, selected.name)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition disabled:opacity-50">
              {!selectedHasBike ? "No bikes available" : hasReservation ? "Already reserved" : reserveBusy ? "Loading…" : "Reserve this station"}
            </button>
            {reserveErr && <div className="mt-2 text-sm text-red-600">{reserveErr}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}