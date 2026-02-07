"use client";

import { useState } from "react";
import GoogleLoader from "./GoogleLoader";
import AddressPicker from "./AddressPicker";
import MapPreview from "./MapPreview";

type LatLon = { lat: number; lon: number; label?: string };

type PlanResponse = {
  tripId: string;
  plan: any;
};

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

    const res = await fetch("/api/trips/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, mode: "transit+bixi" }),
    });

    const json = (await res.json()) as PlanResponse;
    setData(json);
    setLoading(false);
  }

  const pickup = data?.plan?.bixi?.suggestedPickup;
  const dropoff = data?.plan?.bixi?.suggestedDropoff;

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Planner</h1>
          <a className="underline text-sm text-zinc-600" href="/">
            Home
          </a>
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
              Check: API key exists in <code>.env.local</code>, you restarted dev server, and both
              “Maps JavaScript API” + “Places API” are enabled in Google Cloud.
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Enter addresses</h2>
            <button
              className="text-sm underline text-zinc-600"
              type="button"
              onClick={() => {
                setOrigin(null);
                setDestination(null);
                setData(null);
              }}
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AddressPicker
              label="Origin"
              placeholder="e.g. McGill University"
              onSelect={setOrigin}
              ready={googleReady}
            />
            <AddressPicker
              label="Destination"
              placeholder="e.g. Old Montreal"
              onSelect={setDestination}
              ready={googleReady}
            />
          </div>

          <MapPreview
            ready={googleReady}
            origin={origin ? { lat: origin.lat, lon: origin.lon } : null}
            destination={destination ? { lat: destination.lat, lon: destination.lon } : null}
            bixiPickup={
                data?.plan?.bixi?.suggestedPickup
                ? { lat: data.plan.bixi.suggestedPickup.lat, lon: data.plan.bixi.suggestedPickup.lon }
                : null
            }
            bixiDropoff={
                data?.plan?.bixi?.suggestedDropoff
                ? { lat: data.plan.bixi.suggestedDropoff.lat, lon: data.plan.bixi.suggestedDropoff.lon }
                : null
            }
            />


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded border p-3">
              <div className="font-medium">Origin chosen</div>
              <div className="text-zinc-600">
                {origin?.label ?? (origin ? `${origin.lat.toFixed(5)}, ${origin.lon.toFixed(5)}` : "Not set")}
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">Destination chosen</div>
              <div className="text-zinc-600">
                {destination?.label ??
                  (destination ? `${destination.lat.toFixed(5)}, ${destination.lon.toFixed(5)}` : "Not set")}
              </div>
            </div>
          </div>

          <button
            onClick={planTrip}
            disabled={loading || !origin || !destination}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {loading ? "Planning..." : "Plan Trip"}
          </button>
        </div>

        {data && (
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="text-sm text-zinc-500">Trip ID: {data.tripId}</div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded border p-3">
                <div className="font-medium">Suggested Pickup (BIXI)</div>
                {pickup ? (
                  <div className="mt-2 text-sm">
                    <div>{pickup.name}</div>
                    <div className="text-zinc-600">
                      Bikes: {pickup.bikes_available} · Docks: {pickup.docks_available}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-zinc-600">None found</div>
                )}
              </div>

              <div className="rounded border p-3">
                <div className="font-medium">Suggested Dropoff (BIXI)</div>
                {dropoff ? (
                  <div className="mt-2 text-sm">
                    <div>{dropoff.name}</div>
                    <div className="text-zinc-600">
                      Bikes: {dropoff.bikes_available} · Docks: {dropoff.docks_available}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-zinc-600">None found</div>
                )}
              </div>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-zinc-600">Show full JSON</summary>
              <pre className="mt-2 bg-black text-green-300 p-3 rounded overflow-x-auto text-xs">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </main>
  );
}
