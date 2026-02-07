"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LatLon = { lat: number; lon: number };

declare global {
  interface Window {
    google?: any;
  }
}

function toLatLngLiteral(p: LatLon) {
  return { lat: p.lat, lng: p.lon };
}

function stripHtml(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function sumSeconds(...vals: Array<number | undefined>) {
  return vals.reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
}

export default function MapPreview(props: {
  ready: boolean;
  origin: LatLon | null;
  destination: LatLon | null;
  bixiPickup: LatLon | null;
  bixiDropoff: LatLon | null;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);

  const dirServiceRef = useRef<any>(null);

  // Renderers
  const directBikeRendererRef = useRef<any>(null);
  const transitRendererRef = useRef<any>(null);

  const preToPickupRendererRef = useRef<any>(null);
  const bixiBikeRendererRef = useRef<any>(null);
  const postToDestRendererRef = useRef<any>(null);

  // keep bicycling overlay OFF (usually responsible for green network lines)
  const bikeLayerRef = useRef<any>(null);

  const [show, setShow] = useState<"none" | "bike" | "transit" | "both">("both");
  const [toStationMode, setToStationMode] = useState<"WALKING" | "TRANSIT">("WALKING");
  const [routeError, setRouteError] = useState<string | null>(null);

  // Store directions results so we can show info panels
  const [directBikeResult, setDirectBikeResult] = useState<any>(null);
  const [transitResult, setTransitResult] = useState<any>(null);

  const [preResult, setPreResult] = useState<any>(null);
  const [bixiResult, setBixiResult] = useState<any>(null);
  const [postResult, setPostResult] = useState<any>(null);

  const canRoute = useMemo(
    () => !!props.origin && !!props.destination,
    [props.origin, props.destination]
  );

  const hasBixiStations = useMemo(
    () => !!props.bixiPickup && !!props.bixiDropoff,
    [props.bixiPickup, props.bixiDropoff]
  );

  // init map once
  useEffect(() => {
    if (!props.ready) return;
    if (!window.google?.maps) return;
    if (!divRef.current) return;
    if (mapRef.current) return;

    const center = { lat: 45.5019, lng: -73.5674 }; // Montreal
    mapRef.current = new window.google.maps.Map(divRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    dirServiceRef.current = new window.google.maps.DirectionsService();

    directBikeRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      preserveViewport: true,
    });

    transitRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      preserveViewport: true,
    });

    preToPickupRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      preserveViewport: true,
    });

    bixiBikeRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      preserveViewport: true,
    });

    postToDestRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      preserveViewport: true,
    });

    bikeLayerRef.current = new window.google.maps.BicyclingLayer();
    bikeLayerRef.current.setMap(null); // keep OFF
  }, [props.ready]);

  // markers + fit bounds
  useEffect(() => {
    if (!props.ready || !mapRef.current || !window.google?.maps) return;

    if (props.origin) {
      if (!originMarkerRef.current) {
        originMarkerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          label: "A",
        });
      }
      originMarkerRef.current.setPosition(toLatLngLiteral(props.origin));
    } else if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null);
      originMarkerRef.current = null;
    }

    if (props.destination) {
      if (!destMarkerRef.current) {
        destMarkerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          label: "B",
        });
      }
      destMarkerRef.current.setPosition(toLatLngLiteral(props.destination));
    } else if (destMarkerRef.current) {
      destMarkerRef.current.setMap(null);
      destMarkerRef.current = null;
    }

    if (props.origin && props.destination) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(toLatLngLiteral(props.origin));
      bounds.extend(toLatLngLiteral(props.destination));
      if (props.bixiPickup) bounds.extend(toLatLngLiteral(props.bixiPickup));
      if (props.bixiDropoff) bounds.extend(toLatLngLiteral(props.bixiDropoff));
      mapRef.current.fitBounds(bounds, 60);
    }
  }, [props.ready, props.origin, props.destination, props.bixiPickup, props.bixiDropoff]);

  function clearAllDirections() {
    directBikeRendererRef.current?.setDirections({ routes: [] });
    transitRendererRef.current?.setDirections({ routes: [] });
    preToPickupRendererRef.current?.setDirections({ routes: [] });
    bixiBikeRendererRef.current?.setDirections({ routes: [] });
    postToDestRendererRef.current?.setDirections({ routes: [] });
  }

  // fetch routes
  useEffect(() => {
    if (!props.ready) return;
    if (!dirServiceRef.current) return;

    setRouteError(null);
    setDirectBikeResult(null);
    setTransitResult(null);
    setPreResult(null);
    setBixiResult(null);
    setPostResult(null);

    if (!props.origin || !props.destination) {
      clearAllDirections();
      return;
    }

    // Force bike overlay OFF (sometimes it shows up after bike routes)
    bikeLayerRef.current?.setMap(null);

    const origin = toLatLngLiteral(props.origin);
    const destination = toLatLngLiteral(props.destination);

    // Transit: origin -> destination
    dirServiceRef.current.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.TRANSIT,
        provideRouteAlternatives: true,
      },
      (result: any, status: any) => {
        if (status === "OK" && result) {
          setTransitResult(result);
          transitRendererRef.current?.setDirections(result);
          transitRendererRef.current?.setRouteIndex(0);
        } else {
          transitRendererRef.current?.setDirections({ routes: [] });
          setRouteError((prev) => prev ?? `Transit route error: ${status}`);
        }
      }
    );

    // Bike: prefer via BIXI stations when available
    if (props.bixiPickup && props.bixiDropoff) {
      const pickup = toLatLngLiteral(props.bixiPickup);
      const dropoff = toLatLngLiteral(props.bixiDropoff);

      // Leg 1: origin -> pickup (walk or transit)
      dirServiceRef.current.route(
        {
          origin,
          destination: pickup,
          travelMode:
            toStationMode === "TRANSIT"
              ? window.google.maps.TravelMode.TRANSIT
              : window.google.maps.TravelMode.WALKING,
        },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            setPreResult(result);
            preToPickupRendererRef.current?.setDirections(result);
          } else {
            preToPickupRendererRef.current?.setDirections({ routes: [] });
            setRouteError((prev) => prev ?? `To-station route error: ${status}`);
          }
        }
      );

      // Leg 2: pickup -> dropoff (bike)
      dirServiceRef.current.route(
        {
          origin: pickup,
          destination: dropoff,
          travelMode: window.google.maps.TravelMode.BICYCLING,
        },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            setBixiResult(result);
            bixiBikeRendererRef.current?.setDirections(result);
          } else {
            bixiBikeRendererRef.current?.setDirections({ routes: [] });
            setRouteError((prev) => prev ?? `BIXI bike leg error: ${status}`);
          }
        }
      );

      // Leg 3: dropoff -> destination (walk or transit)
      dirServiceRef.current.route(
        {
          origin: dropoff,
          destination,
          travelMode:
            toStationMode === "TRANSIT"
              ? window.google.maps.TravelMode.TRANSIT
              : window.google.maps.TravelMode.WALKING,
        },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            setPostResult(result);
            postToDestRendererRef.current?.setDirections(result);
          } else {
            postToDestRendererRef.current?.setDirections({ routes: [] });
            setRouteError((prev) => prev ?? `From-station route error: ${status}`);
          }
        }
      );

      // hide fallback direct bike
      setDirectBikeResult(null);
      directBikeRendererRef.current?.setDirections({ routes: [] });
    } else {
      // Fallback: direct bike origin -> destination
      dirServiceRef.current.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.BICYCLING,
        },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            setDirectBikeResult(result);
            directBikeRendererRef.current?.setDirections(result);
          } else {
            directBikeRendererRef.current?.setDirections({ routes: [] });
            setRouteError((prev) => prev ?? `Bike route error: ${status}`);
          }
        }
      );

      preToPickupRendererRef.current?.setDirections({ routes: [] });
      bixiBikeRendererRef.current?.setDirections({ routes: [] });
      postToDestRendererRef.current?.setDirections({ routes: [] });
    }
  }, [
    props.ready,
    props.origin,
    props.destination,
    props.bixiPickup,
    props.bixiDropoff,
    toStationMode,
  ]);

  // show/hide layers
  useEffect(() => {
    if (!mapRef.current) return;

    bikeLayerRef.current?.setMap(null);

    transitRendererRef.current?.setMap(
      show === "transit" || show === "both" ? mapRef.current : null
    );

    const bikeMap = show === "bike" || show === "both" ? mapRef.current : null;

    directBikeRendererRef.current?.setMap(bikeMap);
    preToPickupRendererRef.current?.setMap(bikeMap);
    bixiBikeRendererRef.current?.setMap(bikeMap);
    postToDestRendererRef.current?.setMap(bikeMap);
  }, [show]);

  // ---------- Route info helpers ----------
  function firstLeg(result: any) {
    return result?.routes?.[0]?.legs?.[0] ?? null;
  }

  const transitLeg = firstLeg(transitResult);
  const directBikeLeg = firstLeg(directBikeResult);
  const preLeg = firstLeg(preResult);
  const bixiLeg = firstLeg(bixiResult);
  const postLeg = firstLeg(postResult);

  const bikeTotalSeconds = sumSeconds(
    preLeg?.duration?.value,
    bixiLeg?.duration?.value,
    postLeg?.duration?.value
  );

  const bikeTotalKm =
    ((preLeg?.distance?.value ?? 0) +
      (bixiLeg?.distance?.value ?? 0) +
      (postLeg?.distance?.value ?? 0)) /
    1000;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-medium">Routes:</div>

        <button
          type="button"
          className={`px-3 py-1 rounded border text-sm ${
            show === "both" ? "bg-black text-white" : "bg-white"
          }`}
          onClick={() => setShow("both")}
          disabled={!canRoute}
        >
          Both
        </button>

        <button
          type="button"
          className={`px-3 py-1 rounded border text-sm ${
            show === "bike" ? "bg-black text-white" : "bg-white"
          }`}
          onClick={() => setShow("bike")}
          disabled={!canRoute}
        >
          Bike (via BIXI)
        </button>

        <button
          type="button"
          className={`px-3 py-1 rounded border text-sm ${
            show === "transit" ? "bg-black text-white" : "bg-white"
          }`}
          onClick={() => setShow("transit")}
          disabled={!canRoute}
        >
          Transit
        </button>

        <button
          type="button"
          className={`px-3 py-1 rounded border text-sm ${
            show === "none" ? "bg-black text-white" : "bg-white"
          }`}
          onClick={() => setShow("none")}
          disabled={!canRoute}
        >
          None
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-zinc-600">To station:</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={toStationMode}
            onChange={(e) => setToStationMode(e.target.value as any)}
            disabled={!canRoute}
          >
            <option value="WALKING">Walk</option>
            <option value="TRANSIT">Transit</option>
          </select>
        </div>
      </div>

      {!hasBixiStations && (
        <div className="text-xs text-zinc-500">
          Tip: click <span className="font-medium">Plan Trip</span> first so we know the pickup/dropoff stations.
          Until then, Bike falls back to a direct bike route.
        </div>
      )}

      {routeError && (
        <div className="text-xs text-red-600 border rounded p-2 bg-red-50">
          {routeError}
        </div>
      )}

      {/* Map */}
      <div ref={divRef} className="h-[380px] w-full rounded-lg border" />

      {/* Route info panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Bike info */}
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="font-medium">Bike route info</div>

          {hasBixiStations ? (
            <>
              <div className="text-sm text-zinc-700">
                Total:{" "}
                {bikeTotalSeconds
                  ? `${Math.round(bikeTotalSeconds / 60)} min`
                  : "—"}{" "}
                • {bikeTotalKm ? `${bikeTotalKm.toFixed(1)} km` : "—"}
              </div>

              <div className="text-sm text-zinc-600">
                Leg 1 (to pickup): {preLeg?.duration?.text ?? "—"} • {preLeg?.distance?.text ?? "—"}
              </div>
              <div className="text-sm text-zinc-600">
                Leg 2 (BIXI bike): {bixiLeg?.duration?.text ?? "—"} • {bixiLeg?.distance?.text ?? "—"}
              </div>
              <div className="text-sm text-zinc-600">
                Leg 3 (to destination): {postLeg?.duration?.text ?? "—"} • {postLeg?.distance?.text ?? "—"}
              </div>
            </>
          ) : (
            <div className="text-sm text-zinc-600">
              Direct bike: {directBikeLeg?.duration?.text ?? "—"} • {directBikeLeg?.distance?.text ?? "—"}
            </div>
          )}
        </div>

        {/* Transit info */}
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="font-medium">Transit route info</div>

          {transitLeg ? (
            <>
              <div className="text-sm text-zinc-700">
                {transitLeg.duration?.text} • {transitLeg.distance?.text}
              </div>
              <div className="text-sm text-zinc-600">
                {transitLeg.departure_time?.text ? `Depart: ${transitLeg.departure_time.text}` : ""}
                {transitLeg.arrival_time?.text ? ` · Arrive: ${transitLeg.arrival_time.text}` : ""}
              </div>
            </>
          ) : (
            <div className="text-sm text-zinc-600">—</div>
          )}
        </div>
      </div>

      {/* Detailed transit steps (Google Maps-like) */}
      {transitLeg?.steps?.length ? (
        <div className="rounded border bg-white p-4 space-y-3">
          <div className="font-medium">Transit steps</div>

          <ol className="space-y-2">
            {transitLeg.steps.map((step: any, i: number) => {
              if (step.travel_mode === "TRANSIT" && step.transit) {
                const t = step.transit;
                const line = t.line;
                const vehicle = line?.vehicle?.type ?? "TRANSIT";
                const shortName = line?.short_name ?? line?.name ?? "";
                const headsign = t.headsign ? ` → ${t.headsign}` : "";
                const depStop = t.departure_stop?.name ?? "";
                const arrStop = t.arrival_stop?.name ?? "";
                const depTime = t.departure_time?.text ?? "";
                const arrTime = t.arrival_time?.text ?? "";
                const stops = t.num_stops != null ? ` (${t.num_stops} stops)` : "";

                return (
                  <li key={i} className="rounded border p-3">
                    <div className="text-sm font-medium">
                      {vehicle}: {shortName}
                      {headsign}
                    </div>
                    <div className="text-sm text-zinc-600">
                      {depStop} ({depTime}) → {arrStop} ({arrTime}){stops}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {step.duration?.text ? `Time: ${step.duration.text}` : ""}
                      {step.distance?.text ? ` • Distance: ${step.distance.text}` : ""}
                    </div>
                  </li>
                );
              }

              // walking steps
              const instruction = step.instructions ? stripHtml(step.instructions) : "Walk";
              return (
                <li key={i} className="rounded border p-3">
                  <div className="text-sm font-medium">{step.travel_mode}</div>
                  <div className="text-sm text-zinc-600">
                    {instruction}
                    {step.distance?.text ? ` • ${step.distance.text}` : ""}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {step.duration?.text ? `Time: ${step.duration.text}` : ""}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
