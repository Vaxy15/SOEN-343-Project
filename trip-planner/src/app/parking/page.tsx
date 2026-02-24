"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GoogleLoader from "../planner/GoogleLoader";

type ParkingItem = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  raw?: Record<string, string>;
};

type ParkingStatus = {
  user: null | { id: string; email: string; name: string | null };
  reservation: null | {
    id: string;
    parkingId: string;
    name: string;
    address: string;
    lat: number;
    lon: number;
    createdAt: string;
  };
};

declare global {
  interface Window {
    google?: any;
  }
}

function toLatLng(p: { lat: number; lon: number }) {
  return { lat: p.lat, lng: p.lon };
}

export default function ParkingPage() {
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [items, setItems] = useState<ParkingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<ParkingItem | null>(null);
  const [q, setQ] = useState("");

  const [reserveBusy, setReserveBusy] = useState(false);
  const [reserveMsg, setReserveMsg] = useState<string | null>(null);

  const [parkingStatus, setParkingStatus] = useState<ParkingStatus | null>(null);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const didFitRef = useRef(false);

  const loggedIn = !!parkingStatus?.user;
  const hasReservation = !!parkingStatus?.reservation;

  async function loadParkingStatus() {
    const res = await fetch("/api/parking/status", { cache: "no-store" });
    const json = (await res.json()) as ParkingStatus;
    setParkingStatus(json);
  }

  // Load status immediately (public-safe)
  useEffect(() => {
    loadParkingStatus();
  }, []);

  // Load parking list (PUBLIC)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/parking", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load parking");

        if (!cancelled) {
          setItems(json.items ?? []);
          didFitRef.current = false;
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load parking");
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
    if (!qq) return items;
    return items.filter((p) => {
      const hay = `${p.name ?? ""} ${p.address ?? ""} ${p.id ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q]);

  // init map once
  useEffect(() => {
    if (!googleReady) return;
    if (!window.google?.maps) return;
    if (!mapDivRef.current) return;
    if (mapRef.current) return;

    const center = { lat: 45.5019, lng: -73.5674 }; // Montréal
    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [googleReady]);

  // render markers
  useEffect(() => {
    if (!googleReady || !mapRef.current || !window.google?.maps) return;

    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    for (const p of filtered) {
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: toLatLng(p),
        title: p.name,
      });

      marker.addListener("click", () => {
        setSelected(p);
        setReserveMsg(null);

        mapRef.current?.panTo(toLatLng(p));
        const currentZoom = mapRef.current?.getZoom?.() ?? 12;
        if (currentZoom < 15) mapRef.current?.setZoom?.(15);
      });

      markersRef.current.push(marker);
    }

    if (!didFitRef.current && q.trim() === "" && filtered.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      for (const p of filtered) bounds.extend(toLatLng(p));
      mapRef.current.fitBounds(bounds, 60);
      didFitRef.current = true;
    }
  }, [googleReady, filtered, q]);

  async function reserveSelected() {
    if (!selected) return;

    setReserveMsg(null);

    if (!loggedIn) {
      window.location.href = `/auth/login?next=${encodeURIComponent("/parking")}`;
      return;
    }

    if (hasReservation) {
      setReserveMsg("You already have an active parking reservation.");
      return;
    }

    setReserveBusy(true);
    try {
      const res = await fetch("/api/parking/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkingId: selected.id,
          name: selected.name,
          address: selected.address ?? "",
          lat: selected.lat,
          lon: selected.lon,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        window.location.href = `/auth/login?next=${encodeURIComponent("/parking")}`;
        return;
      }

      if (!res.ok) throw new Error(json?.error ?? "Reserve failed.");

      await loadParkingStatus();
      setReserveMsg("Reserved! Your parking reservation is now active.");
    } catch (e: any) {
      setReserveMsg(e?.message ?? "Reserve failed.");
    } finally {
      setReserveBusy(false);
    }
  }

  async function cancelReservation() {
    setReserveMsg(null);

    if (!loggedIn) {
      window.location.href = `/auth/login?next=${encodeURIComponent("/parking")}`;
      return;
    }

    setReserveBusy(true);
    try {
      const res = await fetch("/api/parking/cancel", { method: "POST" });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        window.location.href = `/auth/login?next=${encodeURIComponent("/parking")}`;
        return;
      }

      if (!res.ok) throw new Error(json?.error ?? "Cancel failed.");

      await loadParkingStatus();
      setReserveMsg("Reservation canceled.");
    } catch (e: any) {
      setReserveMsg(e?.message ?? "Cancel failed.");
    } finally {
      setReserveBusy(false);
    }
  }

  const reserveDisabled = reserveBusy || !selected || hasReservation;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--brand-dark)]">
          Parking (Off-street)
        </h1>
      </div>

      <GoogleLoader
        onReady={(ok) => {
          setGoogleReady(ok);
          setGoogleError(ok ? null : "Google Maps/Places failed to load.");
        }}
      />

      {googleError && (
        <div className="rounded border bg-white p-3 text-sm text-red-600">
          {googleError}
          <div className="mt-2 text-xs text-zinc-600">
            Check: API key exists in <code>.env.local</code>, you restarted dev server, and
            “Maps JavaScript API” is enabled.
          </div>
        </div>
      )}

      {/* Reservation summary */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-600">Your parking reservation</div>

            {!loggedIn ? (
              <div className="text-sm text-zinc-600 mt-1">
                You must log in to reserve a parking spot.
              </div>
            ) : hasReservation ? (
              <div className="text-sm text-zinc-700 mt-1">
                Active reservation:{" "}
                <span className="font-medium text-[var(--brand-dark)]">
                  {parkingStatus?.reservation?.name}
                </span>
                {parkingStatus?.reservation?.address ? (
                  <span className="text-zinc-500"> · {parkingStatus.reservation.address}</span>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-zinc-600 mt-1">No active reservation.</div>
            )}
          </div>

          {loggedIn && hasReservation && (
            <button
              onClick={cancelReservation}
              disabled={reserveBusy}
              className="px-4 py-2 rounded-lg border bg-white hover:bg-zinc-50 transition disabled:opacity-50"
            >
              Cancel reservation
            </button>
          )}
        </div>

        {reserveMsg && (
          <div className="mt-3 text-sm text-zinc-700">
            {reserveMsg}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-zinc-600">
            {loading
              ? "Loading parking…"
              : err
              ? "Failed to load parking"
              : `Showing ${filtered.length} locations`}
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search parking…"
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-[320px]"
          />
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div ref={mapDivRef} className="h-[60vh] lg:h-[520px] w-full rounded-xl border" />
            <div className="mt-2 text-xs text-zinc-500 lg:hidden">
              Tip: tap a marker to open details.
            </div>
          </div>

          {/* Desktop details panel */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="rounded-xl border bg-[var(--brand-light)] p-4 h-[520px] overflow-auto">
              <div className="font-medium mb-2">Details</div>

              {!selected ? (
                <div className="text-sm text-zinc-600">
                  Click a marker to view parking details.
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-lg font-semibold">{selected.name}</div>
                    {selected.address ? (
                      <div className="text-sm text-zinc-700">{selected.address}</div>
                    ) : (
                      <div className="text-sm text-zinc-500">No address provided.</div>
                    )}
                    <div className="text-xs text-zinc-600 mt-1">
                      {selected.lat.toFixed(6)}, {selected.lon.toFixed(6)}
                    </div>
                  </div>

                  <button
                    onClick={reserveSelected}
                    disabled={reserveDisabled}
                    className="w-full px-4 py-2 rounded-lg text-white bg-[var(--brand-green)] hover:opacity-90 transition disabled:opacity-50"
                  >
                    {hasReservation ? "Already reserved" : reserveBusy ? "Reserving…" : "Reserve"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-zinc-500">
          Data source: Agence de mobilité durable de Montréal (BornesHorsRue).
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div
        className={`lg:hidden fixed left-0 right-0 bottom-0 z-50 transition-transform duration-200 ${
          selected ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-2xl border bg-white shadow-lg p-4 max-h-[50vh] overflow-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-zinc-500">Parking details</div>
                <div className="text-lg font-semibold break-words">{selected?.name}</div>

                {selected?.address ? (
                  <div className="text-sm text-zinc-700 mt-1 break-words">{selected.address}</div>
                ) : (
                  <div className="text-sm text-zinc-500 mt-1">No address provided.</div>
                )}
              </div>

              <button
                className="px-3 py-1 rounded-lg border bg-white"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>

            <button
              onClick={reserveSelected}
              disabled={reserveDisabled}
              className="mt-3 w-full px-4 py-2 rounded-lg text-white bg-[var(--brand-green)] hover:opacity-90 transition disabled:opacity-50"
            >
              {hasReservation ? "Already reserved" : reserveBusy ? "Reserving…" : "Reserve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}