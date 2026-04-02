// SOEN-343-Project\trip-planner\src\app\planner\MapPreview.tsx
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

export default function MapPreview(props: {
  ready: boolean;
  origin: LatLon | null;
  destination: LatLon | null;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);

  const dirServiceRef = useRef<any>(null);
  const transitRendererRef = useRef<any>(null);

  const [routeError, setRouteError] = useState<string | null>(null);
  const [transitResult, setTransitResult] = useState<any>(null);

  const canRoute = useMemo(() => !!props.origin && !!props.destination, [props.origin, props.destination]);

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

    transitRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      preserveViewport: true,
    });
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
      mapRef.current.fitBounds(bounds, 60);
    }
  }, [props.ready, props.origin, props.destination]);

  // fetch transit route
  useEffect(() => {
    if (!props.ready) return;
    if (!dirServiceRef.current) return;

    setRouteError(null);
    setTransitResult(null);

    if (!props.origin || !props.destination) {
      transitRendererRef.current?.setDirections({ routes: [] });
      return;
    }

    const origin = toLatLngLiteral(props.origin);
    const destination = toLatLngLiteral(props.destination);

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
          setRouteError(`Transit route error: ${status}`);
        }
      }
    );
  }, [props.ready, props.origin, props.destination]);

  function firstLeg(result: any) {
    return result?.routes?.[0]?.legs?.[0] ?? null;
  }

  const transitLeg = firstLeg(transitResult);

  return (
    <div className="space-y-3">
      {routeError && (
        <div className="text-xs text-red-600 border rounded p-2 bg-red-50">
          {routeError}
        </div>
      )}

      <div ref={divRef} className="h-[380px] w-full rounded-lg border" />

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
