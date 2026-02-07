"use client";

import { useEffect, useRef } from "react";

type LatLng = { lat: number; lon: number };

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();

    const existing = document.querySelector('script[data-google-maps="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

export default function MapPicker(props: {
  origin: LatLng | null;
  destination: LatLng | null;
  onPick: (which: "origin" | "destination", value: LatLng) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);

  // ✅ refs that always hold the latest props (avoids stale closure in click handler)
  const originValueRef = useRef<LatLng | null>(null);
  const destValueRef = useRef<LatLng | null>(null);

  useEffect(() => {
    originValueRef.current = props.origin;
    destValueRef.current = props.destination;
  }, [props.origin, props.destination]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    let cancelled = false;

    (async () => {
      await loadGoogleMaps(apiKey);
      if (cancelled || !mapDivRef.current) return;

      const center = { lat: 45.5019, lng: -73.5674 }; // Montreal
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapRef.current.addListener("click", (e: any) => {
        const lat = e.latLng.lat();
        const lon = e.latLng.lng();

        const hasOrigin = !!originValueRef.current;
        const hasDestination = !!destValueRef.current;

        // Click 1 -> origin, Click 2 -> destination, Click 3+ -> move destination
        const which: "origin" | "destination" = !hasOrigin ? "origin" : "destination";

        // Optional: if both already set, keep moving destination (feels natural)
        // If you want to alternate instead, tell me and I'll adjust.
        props.onPick(which, { lat, lon });

        // If neither set, map will set origin. If origin exists, sets/moves destination.
        // (You can reset to set a new origin.)
      });
    })().catch(console.error);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.google?.maps || !mapRef.current) return;

    if (props.origin) {
      if (!originMarkerRef.current) {
        originMarkerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          label: "A",
        });
      }
      originMarkerRef.current.setPosition({ lat: props.origin.lat, lng: props.origin.lon });
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
      destMarkerRef.current.setPosition({ lat: props.destination.lat, lng: props.destination.lon });
    } else if (destMarkerRef.current) {
      destMarkerRef.current.setMap(null);
      destMarkerRef.current = null;
    }
  }, [props.origin, props.destination]);

  return <div ref={mapDivRef} className="h-[420px] w-full rounded-lg border" />;
}
