"use client";

import { useEffect, useRef, useState } from "react";

type LatLon = { lat: number; lon: number; label?: string };

declare global {
  interface Window {
    google?: any;
  }
}

export default function AddressPicker(props: {
  label: string;
  placeholder: string;
  onSelect: (value: LatLon) => void;
  ready: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const [help, setHelp] = useState("Loading Places…");

  useEffect(() => {
    // Wait until Google Places is actually ready
    if (!props.ready) {
      setHelp("Loading Places…");
      return;
    }

    if (!window.google?.maps?.places) {
      setHelp("Places not available (check API enablement / key)");
      return;
    }

    if (!inputRef.current) return;

    // Avoid double init
    if (autocompleteRef.current) {
      setHelp("Choose a suggestion from the dropdown.");
      return;
    }

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        fields: ["geometry", "formatted_address", "name"],
        // Optional: bias results to Canada
        // componentRestrictions: { country: "ca" },
      }
    );

    setHelp("Choose a suggestion from the dropdown.");

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      const loc = place?.geometry?.location;

      if (!loc) {
        setHelp("No geometry found—pick another suggestion.");
        return;
      }

      props.onSelect({
        lat: loc.lat(),
        lon: loc.lng(),
        label: place.formatted_address || place.name || undefined,
      });

      setHelp("Selected ✓");
    });
  }, [props.ready, props]);

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{props.label}</div>
      <input
        ref={inputRef}
        className="w-full border rounded px-3 py-2"
        placeholder={props.placeholder}
        disabled={!props.ready}
      />
      <div className="text-xs text-zinc-500">{help}</div>
    </div>
  );
}
