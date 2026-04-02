"use client";

import { useState } from "react";
import GoogleLoader from "./GoogleLoader";
import AddressPicker from "./AddressPicker";
import MapPreview from "./MapPreview";

type LatLon = { lat: number; lon: number; label?: string };
type PlanResponse = { tripId: string; plan: any };

export default function PlannerPage() {
  const [googleReady, setGoogleReady] = useState(false);
  const [origin, setOrigin] = useState<LatLon | null>(null);
  const [destination, setDestination] = useState<LatLon | null>(null);
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  async function planTrip() {
    if (!origin || !destination) return;
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/trips/plan?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ origin, destination, mode: "transit" }),
      });
      if (!res.ok) throw new Error(`Plan API failed (${res.status})`);
      const json = (await res.json()) as PlanResponse;
      setData(json);
    } catch (e: any) {
      alert(e?.message ?? "Failed to plan trip");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Trip Planner</h1>
        <p className="text-sm text-slate-500 mt-1">Get transit directions anywhere in Montréal</p>
      </div>

      <GoogleLoader onReady={(ok) => { setGoogleReady(ok); setGoogleError(ok ? null : "Google Maps failed to load."); }} />

      {googleError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          {googleError}
          <div className="mt-1 text-xs text-slate-500">
            Check: API key in <code className="bg-slate-100 px-1 rounded">.env.local</code>, Maps JS API + Places API enabled.
          </div>
        </div>
      )}

      {/* Input card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Enter addresses</div>
          <button type="button" onClick={() => { setOrigin(null); setDestination(null); setData(null); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition">
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AddressPicker label="Origin" placeholder="e.g. McGill University" onSelect={setOrigin} ready={googleReady} />
          <AddressPicker label="Destination" placeholder="e.g. Old Montreal" onSelect={setDestination} ready={googleReady} />
        </div>

        <MapPreview
          ready={googleReady}
          origin={origin ? { lat: origin.lat, lon: origin.lon } : null}
          destination={destination ? { lat: destination.lat, lon: destination.lon } : null}
        />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <div className="text-xs text-slate-400 mb-0.5">Origin</div>
            <div className="font-medium text-slate-700 truncate">
              {origin?.label ?? (origin ? `${origin.lat.toFixed(4)}, ${origin.lon.toFixed(4)}` : "Not set")}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <div className="text-xs text-slate-400 mb-0.5">Destination</div>
            <div className="font-medium text-slate-700 truncate">
              {destination?.label ?? (destination ? `${destination.lat.toFixed(4)}, ${destination.lon.toFixed(4)}` : "Not set")}
            </div>
          </div>
        </div>

        <button onClick={planTrip} disabled={loading || !origin || !destination}
          className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm shadow-sm disabled:opacity-50 transition">
          {loading ? "Planning…" : "🗺️ Plan Trip"}
        </button>
      </div>

      {data && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-700">Trip saved</div>
            <div className="text-xs text-slate-400 font-mono">{data.tripId}</div>
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700 transition">View raw plan JSON</summary>
            <pre className="mt-3 bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto text-xs leading-relaxed">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
