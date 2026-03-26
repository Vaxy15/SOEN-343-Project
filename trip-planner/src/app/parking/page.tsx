"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleLoader from "../planner/GoogleLoader";

declare global {
  interface Window {
    google?: any;
  }
}

type ParkingItem = {
  parkingId: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
};

type ParkingStatus = {
  user: null | { id: string; email: string; name?: string | null };
  reservation: null | {
    id: string;
    parkingId: string;
    name: string;
    address?: string;
    lat: number;
    lon: number;
    createdAt: string;
  };
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
    const json = (await res.json()) as ParkingStatus;
    setStatus(json);
  }

  async function loadParking() {
    setLoading(true);
    setLoadingMsg(null);

    try {
      const res = await fetch("/api/parking", { cache: "no-store" });
      const json = await res.json();

      const items = (json?.items ?? []).map((x: any) => ({
        ...x,
        parkingId: x.parkingId ?? x.id,
      })) as ParkingItem[];

      setRows(items);
      setSelected((prev) => {
        if (!prev) return items[0] ?? null;
        return items.find((x) => x.parkingId === prev.parkingId) ?? items[0] ?? null;
      });
    } catch (e: any) {
      setLoadingMsg(e?.message ?? "Failed to load parking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParkingStatus();
    loadParking();
  }, []);

  // ✅ filtered must be declared BEFORE the useEffects that reference it
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((x) => {
      return (
        x.name.toLowerCase().includes(needle) ||
        String(x.parkingId).toLowerCase().includes(needle) ||
        String(x.address ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q]);

  // Initialize map once Google is ready
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

  // Place markers whenever filtered list changes
  useEffect(() => {
    if (!googleReady || !mapRef.current || !window.google?.maps) return;

    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    for (const item of filtered) {
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: { lat: item.lat, lng: item.lon },
        title: item.name,
      });

      marker.addListener("click", () => {
        setSelected(item);
        setReserveMsg(null);
        mapRef.current?.panTo({ lat: item.lat, lng: item.lon });
        const currentZoom = mapRef.current?.getZoom?.() ?? 12;
        if (currentZoom < 15) mapRef.current?.setZoom?.(15);
      });

      markersRef.current.push(marker);
    }

    if (!didFitRef.current && q.trim() === "" && filtered.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      for (const item of filtered) bounds.extend({ lat: item.lat, lng: item.lon });
      mapRef.current.fitBounds(bounds, 60);
      didFitRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, filtered]);

  async function reserveParking(item: ParkingItem) {
    setReserveBusy(true);
    setReserveMsg(null);

    try {
      const paymentUrl =
        `/payment?type=parking` +
        `&parkingId=${encodeURIComponent(item.parkingId)}` +
        `&name=${encodeURIComponent(item.name)}` +
        `&address=${encodeURIComponent(item.address ?? "")}` +
        `&lat=${encodeURIComponent(String(item.lat))}` +
        `&lon=${encodeURIComponent(String(item.lon))}`;

      router.push(paymentUrl);
    } catch (e: any) {
      setReserveMsg(e?.message ?? "Failed to start parking checkout.");
    } finally {
      setReserveBusy(false);
    }
  }

  async function returnParking() {
    setReserveMsg(null);

    if (!loggedIn) {
      window.location.href = `/auth/login?next=${encodeURIComponent("/parking")}`;
      return;
    }

    setReserveBusy(true);
    try {
      const res = await fetch("/api/parking/return", { method: "POST" });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        window.location.href = `/auth/login?next=${encodeURIComponent("/parking")}`;
        return;
      }

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
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--brand-dark)]">Parking</h1>
      </div>

      <GoogleLoader
        onReady={(ok) => {
          setGoogleReady(ok);
          setGoogleError(ok ? null : "Google Maps failed to load.");
        }}
      />

      {googleError && (
        <div className="rounded border bg-white p-3 text-sm text-red-600">
          {googleError}
        </div>
      )}

      {/* Reservation status bar */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-600">Parking reservation status</div>

            {!loggedIn ? (
              <div className="text-sm text-zinc-600 mt-1">
                You must log in to reserve parking.
              </div>
            ) : hasReservation ? (
              <div className="text-sm text-zinc-600 mt-1">
                Your reservation:{" "}
                <span className="font-medium text-[var(--brand-dark)]">
                  {status?.reservation?.name}
                </span>
              </div>
            ) : (
              <div className="text-sm text-zinc-600 mt-1">No active reservation.</div>
            )}
          </div>

          {loggedIn && hasReservation && (
            <button
              onClick={returnParking}
              disabled={reserveBusy}
              className="px-4 py-2 rounded-lg border bg-white hover:bg-zinc-50 transition disabled:opacity-50"
            >
              Return Parking Space
            </button>
          )}
        </div>

        {reserveMsg && <div className="mt-3 text-sm text-zinc-700">{reserveMsg}</div>}
      </div>

      {/* Main content */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-zinc-600">
            {loading
              ? "Loading parking…"
              : loadingMsg
              ? "Failed to load parking"
              : `Showing ${filtered.length} / ${rows.length} locations`}
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search parking…"
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-[320px]"
          />
        </div>

        {loadingMsg && <div className="text-sm text-red-600">{loadingMsg}</div>}

        {/* Map + details panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div
              ref={mapDivRef}
              className="h-[60vh] lg:h-[520px] w-full rounded-xl border"
            />
          </div>

          <div className="hidden lg:block lg:col-span-1">
            <div className="rounded-xl border bg-[var(--brand-light)] p-4 h-[520px] overflow-auto">
              <div className="font-medium mb-2">Details</div>

              {!selected ? (
                <div className="text-sm text-zinc-600">
                  Click a map marker or table row to view details.
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-lg font-semibold">{selected.name}</div>
                    <div className="text-sm text-zinc-600 mt-1">
                      {selected.address || "—"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {selected.lat}, {selected.lon}
                    </div>
                  </div>

                  <button
                    disabled={hasReservation || reserveBusy}
                    onClick={() => reserveParking(selected)}
                    className="w-full px-4 py-2 rounded-lg text-white bg-[var(--brand-blue)] hover:opacity-90 transition disabled:opacity-50"
                  >
                    {hasReservation
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-zinc-900">
            <thead className="text-left text-zinc-600 border-b">
              <tr>
                <th className="py-2">Location</th>
                <th className="py-2">Address</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.parkingId}
                  className={`border-b cursor-pointer ${
                    selected?.parkingId === item.parkingId ? "bg-zinc-50" : ""
                  }`}
                  onClick={() => {
                    setSelected(item);
                    if (mapRef.current && window.google?.maps) {
                      mapRef.current.panTo({ lat: item.lat, lng: item.lon });
                      const z = mapRef.current.getZoom?.() ?? 12;
                      if (z < 15) mapRef.current.setZoom?.(15);
                    }
                  }}
                >
                  <td className="py-2 font-medium">{item.name}</td>
                  <td className="py-2 text-zinc-600">{item.address || "—"}</td>
                  <td className="py-2 text-right">
                    <button
                      disabled={hasReservation || reserveBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        reserveParking(item);
                      }}
                      className="px-3 py-1.5 rounded-lg text-white bg-[var(--brand-blue)] hover:opacity-90 transition disabled:opacity-40"
                    >
                      {hasReservation
                        ? "Already reserved"
                        : reserveBusy
                        ? "Loading…"
                        : "Reserve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 text-xs text-zinc-500">
            Showing {filtered.length} / {rows.length} locations
          </div>
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
                {selected?.address && (
                  <div className="text-sm text-zinc-600 mt-1">{selected.address}</div>
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
              disabled={hasReservation || reserveBusy}
              onClick={() => selected && reserveParking(selected)}
              className="mt-3 w-full px-4 py-2 rounded-lg text-white bg-[var(--brand-blue)] hover:opacity-90 transition disabled:opacity-50"
            >
              {hasReservation
                ? "Already reserved"
                : reserveBusy
                ? "Loading…"
                : "Reserve"}
            </button>

            {reserveMsg && (
              <div className="mt-2 text-sm text-red-600">{reserveMsg}</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}