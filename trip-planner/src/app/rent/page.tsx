"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GoogleLoader from "../planner/GoogleLoader";
import { useRouter } from "next/navigation";
import type { GbfsStation } from "@/lib/providers/gbfs";

type Row = GbfsStation;

type BikeStatus = {
  available: number | null;
  reservation: null | {
    id: string;
    stationId: string;
    stationName: string;
    createdAt: string;
  };
  user: null | { id: string; email: string; name: string | null };
};

declare global {
  interface Window {
    google?: any;
  }
}

function toLatLng(p: { lat: number; lon: number }) {
  return { lat: p.lat, lng: p.lon };
}

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
    const json = (await res.json()) as BikeStatus;
    setBikeStatus(json);
  }

  async function loadStations() {
    setLoadingStations(true);
    setStationsErr(null);

    try {
      const res = await fetch("/api/bikes/stations", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to load stations.");
      }

      const stations = (json?.stations ?? []) as Row[];
      setRows(stations);

      setSelected((prev) => {
        if (!prev) return stations[0] ?? null;
        return stations.find((s) => s.station_id === prev.station_id) ?? stations[0] ?? null;
      });
    } catch (e: any) {
      setStationsErr(e?.message ?? "Failed to load stations.");
    } finally {
      setLoadingStations(false);
    }
  }

  useEffect(() => {
    loadBikeStatus();
    loadStations();
  }, []);

  async function reserveBike(stationId: string, stationName: string) {
    setReserveBusy(true);
    setReserveErr(null);

    try {
      const paymentUrl = `/payment?type=bike&stationId=${encodeURIComponent(
        stationId
      )}&stationName=${encodeURIComponent(stationName)}`;

      router.push(paymentUrl);
    } catch (e: any) {
      setReserveErr(e?.message ?? "Failed to start bike checkout.");
    } finally {
      setReserveBusy(false);
    }
  }

  async function returnBike() {
    setReserveBusy(true);
    setReserveErr(null);

    try {
      const res = await fetch("/api/bikes/return", {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to return bike.");
      }

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

    return rows.filter((s) => {
      return (
        s.name.toLowerCase().includes(needle) ||
        s.station_id.toLowerCase().includes(needle)
      );
    });
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
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: toLatLng(s),
        title: s.name,
      });

      marker.addListener("click", () => {
        setSelected(s);
        setReserveErr(null);
        mapRef.current?.panTo(toLatLng(s));
        const currentZoom = mapRef.current?.getZoom?.() ?? 12;
        if (currentZoom < 15) mapRef.current?.setZoom?.(15);
      });

      markersRef.current.push(marker);
    }

    if (!didFitRef.current && q.trim() === "" && filtered.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      for (const s of filtered) bounds.extend(toLatLng(s));
      mapRef.current.fitBounds(bounds, 60);
      didFitRef.current = true;
    }
  }, [googleReady, filtered, q]);

  const selectedStationHasBike =
    !!selected &&
    selected.is_installed === 1 &&
    selected.is_renting === 1 &&
    (selected.bikes_available ?? 0) > 0;

  const canReserveSelected =
    !!selected &&
    selectedStationHasBike &&
    !hasReservation &&
    !reserveBusy;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--brand-dark)]">
          Reserve a Bike (BIXI)
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
        </div>
      )}

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-600">Bike reservation status</div>

            {!loggedIn ? (
              <div className="text-sm text-zinc-600 mt-1">
                You must log in to reserve a bike.
              </div>
            ) : hasReservation ? (
              <div className="text-sm text-zinc-600 mt-1">
                Your reservation:{" "}
                <span className="font-medium text-[var(--brand-dark)]">
                  {bikeStatus?.reservation?.stationName}
                </span>
              </div>
            ) : (
              <div className="text-sm text-zinc-600 mt-1">No active reservation.</div>
            )}
          </div>

          {loggedIn && hasReservation && (
            <button
              onClick={returnBike}
              disabled={reserveBusy}
              className="px-4 py-2 rounded-lg border bg-white hover:bg-zinc-50 transition disabled:opacity-50"
            >
              Return BIXI
            </button>
          )}
        </div>

        {reserveErr && <div className="mt-3 text-sm text-red-600">{reserveErr}</div>}
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-zinc-600">
            {loadingStations
              ? "Loading stations…"
              : stationsErr
              ? "Failed to load stations"
              : `Showing ${filtered.length} / ${rows.length} stations`}
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search station…"
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-[320px]"
          />
        </div>

        {stationsErr && <div className="text-sm text-red-600">{stationsErr}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div ref={mapDivRef} className="h-[60vh] lg:h-[520px] w-full rounded-xl border" />
          </div>

          <div className="hidden lg:block lg:col-span-1">
            <div className="rounded-xl border bg-[var(--brand-light)] p-4 h-[520px] overflow-auto">
              <div className="font-medium mb-2">Details</div>

              {!selected ? (
                <div className="text-sm text-zinc-600">
                  Click a station marker to view details.
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-lg font-semibold">{selected.name}</div>
                    <div className="text-sm text-zinc-700">
                      Bikes: <span className="font-medium">{selected.bikes_available}</span> ·
                      Docks: <span className="font-medium">{selected.docks_available}</span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {selected.is_installed ? "Installed" : "Not installed"} ·{" "}
                      {selected.is_renting ? "Renting" : "Not renting"} ·{" "}
                      {selected.is_returning ? "Returning" : "Not returning"}
                    </div>
                  </div>

                  <button
                    disabled={!canReserveSelected}
                    onClick={() => reserveBike(selected.station_id, selected.name)}
                    className="w-full px-4 py-2 rounded-lg text-white bg-[var(--brand-green)] hover:opacity-90 transition disabled:opacity-50"
                  >
                    {!selectedStationHasBike
                      ? "No bikes here"
                      : hasReservation
                      ? "Already reserved"
                      : reserveBusy
                      ? "Loading…"
                      : "Reserve"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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
                const stationHasBike =
                  s.is_installed === 1 && s.is_renting === 1 && (s.bikes_available ?? 0) > 0;

                const canReserve = stationHasBike && !hasReservation && !reserveBusy;

                return (
                  <tr
                    key={s.station_id}
                    className={`border-b ${
                      selected?.station_id === s.station_id ? "bg-zinc-50" : ""
                    }`}
                    onClick={() => setSelected(s)}
                    style={{ cursor: "pointer" }}
                  >
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
                        disabled={!canReserve}
                        onClick={(e) => {
                          e.stopPropagation();
                          reserveBike(s.station_id, s.name);
                        }}
                        className="px-3 py-1.5 rounded-lg text-white bg-[var(--brand-green)] hover:opacity-90 transition disabled:opacity-40"
                      >
                        {stationHasBike
                          ? hasReservation
                            ? "Already reserved"
                            : reserveBusy
                            ? "Loading…"
                            : "Reserve"
                          : "No bikes"}
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
      </div>

      <div
        className={`lg:hidden fixed left-0 right-0 bottom-0 z-50 transition-transform duration-200 ${
          selected ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-2xl border bg-white shadow-lg p-4 max-h-[50vh] overflow-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-zinc-500">Station details</div>
                <div className="text-lg font-semibold break-words">{selected?.name}</div>
                {selected && (
                  <div className="text-sm text-zinc-700 mt-1">
                    Bikes: <span className="font-medium">{selected.bikes_available}</span> ·
                    Docks: <span className="font-medium">{selected.docks_available}</span>
                  </div>
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
              disabled={!canReserveSelected}
              onClick={() => selected && reserveBike(selected.station_id, selected.name)}
              className="mt-3 w-full px-4 py-2 rounded-lg text-white bg-[var(--brand-green)] hover:opacity-90 transition disabled:opacity-50"
            >
              {!selectedStationHasBike
                ? "No bikes here"
                : hasReservation
                ? "Already reserved"
                : reserveBusy
                ? "Loading…"
                : "Reserve"}
            </button>

            {reserveErr && <div className="mt-2 text-sm text-red-600">{reserveErr}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}