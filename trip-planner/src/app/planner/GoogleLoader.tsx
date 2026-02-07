"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleLoader(props: {
  onReady: (ready: boolean) => void;
}) {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local");
      props.onReady(false);
      return;
    }

    // Already loaded with places
    if (window.google?.maps?.places) {
      props.onReady(true);
      return;
    }

    const existing = document.querySelector(
      'script[data-google-maps="1"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => props.onReady(true));
      existing.addEventListener("error", () => props.onReady(false));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "1";

    script.onload = () => props.onReady(true);
    script.onerror = () => props.onReady(false);

    document.head.appendChild(script);
  }, [props]);

  return null;
}
