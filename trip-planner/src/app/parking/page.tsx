"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleLoader from "../planner/GoogleLoader";

declare global { interface Window { google?: any } }

type ParkingItem = { parkingId: string; name: string; address?: string; lat: number; lon: number };
type ParkingStatus = {
  user: null | { id: string; email: string; name?: string | null };
  reservation: null | { id: string; parkingId: string; name: string; address?: string; lat: number; lon: number; createdAt: string };
};

export default function ParkingPage() {
  const router = useRouter();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParkingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [reserveMsg, setReserveMsg] = useState<string | null>(null);
  const [reserveBusy, setReserveBusy] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ParkingStatus | null>(null);
  const [selected, setSelected] = useState<ParkingItem | null>(null);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const didFitRef = useRef(false);

  const loggedIn = !!status?.user;
  const hasReservation = !!status?.reservation;

  async function loadParkingStatus() {
    const res = await fetch("/api/parking/status", { cache: "no-store" });
    setStatus((await res.json()) as ParkingStatus);
  }

  async function loadParking() {
    setLoading(true);
    setLoadingMsg(null);
    try {
      const res = await fetch("/api/parking", { cache: "no-store" });
      const json = await res.json();
      const items = (json?.items ?? []).map((x: any) => ({ ...x, parkingId: x.parkingId ?? x.id })) as ParkingItem[];
      setRows(items);
      setSelected((prev) => prev ? items.find((x) => x.parkingId === prev.parkingId) ?? items[0] ?? null : items[0] ?? null);
    } catch (e: any) {
      setLoadingMsg(e?.message ?? "Failed to load parking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadParkingStatus(); loadParking(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((x) => x.name.toLowerCase().includes(needle) || String(x.parkingId).toLowerCase().includes(needle) || String(x.address ?? "").toLowerCase().includes(needle));
  }, [rows, q]);

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
    for (const item of filtered) {
      const marker = new window.google.maps.Marker({ map: mapRef.current, position: { lat: item.lat, lng: item.lon }, title: item.name });
      marker.addListener("click", () => {
        setSelected(item);
        setReserveMsg(null);
        mapRef.current?.panTo({ lat: item.lat, lng: item.lon });
        if ((mapRef.current?.getZoom?.() ?? 12) < 15) mapRef.current?.setZoom?.(15);
      });
      markersRef.current.push(marker);
    }
    if (!didFitRef.current && filtered.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      for (const item of filtered) bounds.extend({ lat: item.lat, lng: item.lon });
      mapRef.current.fitBounds(bounds, 60);
      didFitRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, filtered]);

  async function reserveParking(item: ParkingItem) {
    setReserveBusy(true);
    try {
      router.push(`/payment?type=parking&parkingId=${encodeURIComponent(item.parkingId)}&name=${encodeURIComponent(item.name)}&address=${encodeURIComponent(item.address ?? "")}&lat=${encodeURIComponent(String(item.lat))}&lon=${encodeURIComponent(String(item.lon))}`);
    } catch (e: any) {
      setReserveMsg(e?.message ?? "Failed.");
    } finally {
      setReserveBusy(false);
    }
  }

  async function returnParking() {
    setReserveMsg(null);
    if (!loggedIn) { window.location.href = `/auth/login?next=/parking`; return; }
    setReserveBusy(true);
    try {
      const res = await fetch("/api/parking/return", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) { window.location.href = `/auth/login?next=/parking`; return; }
      if (!res.ok) throw new Error(json?.error ?? "Return failed.");
      await loadParkingStatus();
      setReserveMsg("Parking space returned.");
    } catch (e: any) {
      setReserveMsg(e?.message ?? "Return failed.");
    } finally {
      setReserveBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Parking</h1>
        <p className="text-sm text-slate-500 mt-1">Off-street parking locations across Montréal</p>
      </div>

      <GoogleLoader onReady={(ok) => { setGoogleReady(ok); setGoogleError(ok ? null : "Google Maps failed to load."); }} />
      {googleError && <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">{googleError}</div>}

      {/* Status */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reservation status</div>
            {!loggedIn ? (
              <p className="text-sm text-slate-500">Log in to reserve parking</p>
            ) : hasReservation ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-800">{status?.reservation?.name}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active reservation</p>
            )}
          </div>
          {loggedIn && hasReservation && (
            <button onClick={returnParking} disabled={reserveBusy}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition disabled:opacity-50">
              Return Space
            </button>
          )}
        </div>
        {reserveMsg && <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{reserveMsg}</div>}
      </div>

      {/* Map + list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-500">
            {loading ? "Loading…" : loadingMsg ? "Error" : `${filtered.length} of ${rows.length} locations`}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parking…"
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
        </div>

        {loadingMsg && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{loadingMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div ref={mapDivRef} className="h-[60vh] lg:h-[520px] w-full rounded-xl border border-slate-100" />
          </div>
          <div className="hidden lg:flex flex-col">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 h-[520px] overflow-auto">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Details</div>
              {!selected ? (
                <p className="text-sm text-slate-500">Click a marker to view details</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-slate-800">{selected.name}</div>
                    <div className="text-sm text-slate-500 mt-1">{selected.address || "—"}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}</div>
                  </div>
                  <button disabled={hasReservation || reserveBusy} onClick={() => reserveParking(selected)}
                    className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition disabled:opacity-50">
                    {hasReservation ? "Already reserved" : reserveBusy ? "Loading…" : "Reserve"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2.5 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                <th className="text-left py-2.5 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Address</th>
                <th className="text-right py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.parkingId} onClick={() => { setSelected(item); if (mapRef.current && window.google?.maps) { mapRef.current.panTo({ lat: item.lat, lng: item.lon }); if ((mapRef.current.getZoom?.() ?? 12) < 15) mapRef.current.setZoom?.(15); } }}
                  className={`border-b border-slate-50 cursor-pointer transition ${selected?.parkingId === item.parkingId ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                  <td className="py-2.5 pr-3 font-medium text-slate-800">{item.name}</td>
                  <td className="py-2.5 pr-3 text-slate-500 hidden sm:table-cell">{item.address || "—"}</td>
                  <td className="py-2.5 text-right">
                    <button disabled={hasReservation || reserveBusy} onClick={(e) => { e.stopPropagation(); reserveParking(item); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 transition disabled:opacity-40">
                      {hasReservation ? "Reserved" : "Reserve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile sheet */}
      <div className={`lg:hidden fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ${selected ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Parking</div>
                <div className="font-semibold text-slate-800">{selected?.name}</div>
                {selected?.address && <div className="text-sm text-slate-500 mt-0.5">{selected.address}</div>}
              </div>
              <button onClick={() => setSelected(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition">✕</button>
            </div>
            <button disabled={hasReservation || reserveBusy} onClick={() => selected && reserveParking(selected)}
              className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition disabled:opacity-50">
              {hasReservation ? "Already reserved" : reserveBusy ? "Loading…" : "Reserve this spot"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}