import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Off-street ("hors rue") paid parking pay stations dataset
const BORNES_HORS_RUE_CSV =
  "https://www.agencemobilitedurable.ca/images/data/BornesHorsRue.csv";

/**
 * Robust coordinate parsing:
 * Handles "-73. 6053" (space after dot), "45,5021", etc.
 */
function parseCoord(v: unknown): number {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".")
    .replace(/\s+/g, ""); // remove spaces everywhere

  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Minimal CSV parser that supports quoted fields and commas.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      row.push(cur);
      cur = "";
      continue;
    }

    if (c === "\n") {
      row.push(cur);
      cur = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    if (c === "\r") continue;

    cur += c;
  }

  if (cur.length || row.length) {
    row.push(cur);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }

  return rows;
}

function findCol(headers: string[], candidates: string[]) {
  const norm = (s: string) => s.trim().toLowerCase();
  const h = headers.map(norm);

  // exact match first
  for (const cand of candidates) {
    const idx = h.indexOf(norm(cand));
    if (idx !== -1) return idx;
  }

  // contains match fallback
  for (const cand of candidates) {
    const c = norm(cand);
    const idx = h.findIndex((x) => x.includes(c));
    if (idx !== -1) return idx;
  }

  return -1;
}

export async function GET() {
  const res = await fetch(BORNES_HORS_RUE_CSV, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Failed to fetch parking CSV (${res.status})` },
      { status: 502 }
    );
  }

  const csv = await res.text();
  const table = parseCsv(csv);

  if (table.length < 2) {
    return NextResponse.json({ source: "BornesHorsRue", count: 0, items: [] });
  }

  const headers = table[0];

  // Common header names in EN/FR datasets
  const latIdx = findCol(headers, ["latitude", "lat"]);
  const lonIdx = findCol(headers, ["longitude", "lon", "lng"]);
  const idIdx = findCol(headers, ["id", "identifiant", "borne_id", "id_borne"]);
  const nameIdx = findCol(headers, ["nom", "name", "station", "site"]);
  const addrIdx = findCol(headers, ["adresse", "address", "lieu", "emplacement"]);

  const items = table.slice(1).map((r, i) => {
    const lat = latIdx >= 0 ? parseCoord(r[latIdx]) : NaN;
    const lon = lonIdx >= 0 ? parseCoord(r[lonIdx]) : NaN;

    const id =
      (idIdx >= 0 && String(r[idIdx] ?? "").trim()) || `horsrue-${i}`;

    const name =
      (nameIdx >= 0 && String(r[nameIdx] ?? "").trim()) || "Off-street parking";

    const address = (addrIdx >= 0 && String(r[addrIdx] ?? "").trim()) || "";

    return {
      id,
      name,
      address,
      lat,
      lon,
      raw: Object.fromEntries(headers.map((h, j) => [h, r[j] ?? ""])),
    };
  });

  // Montréal-ish bounding box to remove outliers that cause "Africa" fitBounds
  const MTL = {
    minLat: 45.35,
    maxLat: 45.75,
    minLon: -73.95,
    maxLon: -73.35,
  };

  const filtered = items.filter((x) => {
    if (!Number.isFinite(x.lat) || !Number.isFinite(x.lon)) return false;
    return (
      x.lat >= MTL.minLat &&
      x.lat <= MTL.maxLat &&
      x.lon >= MTL.minLon &&
      x.lon <= MTL.maxLon
    );
  });

  return NextResponse.json(
    { source: "BornesHorsRue", count: filtered.length, items: filtered },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
