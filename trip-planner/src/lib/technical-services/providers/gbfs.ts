// SOEN-343-Project/trip-planner/src/lib/providers/gbfs.ts

export type GbfsStation = {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity?: number;

  bikes_available?: number;
  docks_available?: number;

  is_installed?: number;
  is_renting?: number;
  is_returning?: number;
  last_reported?: number;
};

const GBFS_INDEX_URL = "https://gbfs.velobixi.com/gbfs/2-2/gbfs.json";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 15 } }); // cache a bit on server
  if (!res.ok) throw new Error(`GBFS fetch failed: ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

function asNumber(v: any): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function sumTypedBikes(typed: any): number | undefined {
  // GBFS typed availability varies by operator; handle common patterns
  // Examples:
  // - { mechanical: 3, ebike: 2 }
  // - { mechanical: 3, electric: 2 }
  // - { "1": 3, "2": 2 }
  if (!typed || typeof typed !== "object") return undefined;

  let sum = 0;
  let sawNumber = false;

  for (const k of Object.keys(typed)) {
    const n = asNumber(typed[k]);
    if (typeof n === "number") {
      sum += n;
      sawNumber = true;
    }
  }

  return sawNumber ? sum : undefined;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Deterministic pseudo-random number based on a string (station_id)
// so “fake” availability stays stable across reloads.
function hash01(s: string): number {
  let h = 2166136261; // FNV-1a-ish
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // convert to [0,1)
  return ((h >>> 0) % 10000) / 10000;
}

function inferAvailabilityFromCapacity(stationId: string, capacity?: number) {
  const cap = typeof capacity === "number" && capacity > 0 ? capacity : 20;
  // pick a stable ratio between ~25% and ~75%
  const r = 0.25 + hash01(stationId) * 0.5;
  const bikes = clamp(Math.round(cap * r), 0, cap);
  const docks = clamp(cap - bikes, 0, cap);
  return { bikes, docks, cap };
}

function extractBikes(st: any, stationId: string, capacity?: number): number {
  // Common GBFS fields:
  // - num_bikes_available
  // - num_bikes_available_types (object)
  // Some operators also put "num_bikes_available" inside nested structures.
  const direct = asNumber(st?.num_bikes_available);
  if (typeof direct === "number") return direct;

  const typed =
    sumTypedBikes(st?.num_bikes_available_types) ??
    sumTypedBikes(st?.num_bikes_available_by_type) ??
    sumTypedBikes(st?.num_bikes_available_type);

  if (typeof typed === "number") return typed;

  // If still missing, fake from capacity
  return inferAvailabilityFromCapacity(stationId, capacity).bikes;
}

function extractDocks(st: any, stationId: string, capacity?: number): number {
  // Common GBFS fields:
  // - num_docks_available
  // - num_docks_available_types (rare)
  const direct = asNumber(st?.num_docks_available);
  if (typeof direct === "number") return direct;

  const typed =
    sumTypedBikes(st?.num_docks_available_types) ??
    sumTypedBikes(st?.num_docks_available_by_type);

  if (typeof typed === "number") return typed;

  // If missing, fake from capacity (cap - bikes)
  const { bikes, cap } = inferAvailabilityFromCapacity(stationId, capacity);
  return clamp(cap - bikes, 0, cap);
}

export async function getBixiStationsMerged(): Promise<GbfsStation[]> {
  // 1) Load gbfs.json and find station_information + station_status URLs
  const index = await fetchJson<any>(GBFS_INDEX_URL);

  const feeds = index?.data?.en?.feeds ?? index?.data?.fr?.feeds ?? [];
  const infoUrl = feeds.find((f: any) => f.name === "station_information")?.url;
  const statusUrl = feeds.find((f: any) => f.name === "station_status")?.url;

  if (!infoUrl || !statusUrl) {
    throw new Error("GBFS index did not include station_information/station_status");
  }

  // 2) Fetch both and merge by station_id
  const [info, status] = await Promise.all([fetchJson<any>(infoUrl), fetchJson<any>(statusUrl)]);

  const infoById = new Map<string, any>();
  for (const s of info?.data?.stations ?? []) infoById.set(String(s.station_id), s);

  const merged: GbfsStation[] = [];
  for (const raw of status?.data?.stations ?? []) {
    const station_id = String(raw.station_id);
    const si = infoById.get(station_id);
    if (!si) continue;

    const capacity = asNumber(si.capacity);
    const bikes = extractBikes(raw, station_id, capacity);
    const docks = extractDocks(raw, station_id, capacity);

    merged.push({
      station_id,
      name: si.name,
      lat: si.lat,
      lon: si.lon,
      capacity,

      bikes_available: bikes,
      docks_available: docks,

      is_installed: asNumber(raw.is_installed),
      is_renting: asNumber(raw.is_renting),
      is_returning: asNumber(raw.is_returning),
      last_reported: asNumber(raw.last_reported),
    });
  }

  return merged;
}

// Simple nearest-station helper (good enough for a project)
export function nearestStations(
  stations: GbfsStation[],
  lat: number,
  lon: number,
  k = 3,
  opts?: { requireBikes?: boolean; requireDocks?: boolean }
): GbfsStation[] {
  const requireBikes = opts?.requireBikes ?? false;
  const requireDocks = opts?.requireDocks ?? false;

  const filtered = stations.filter((s) => {
    if (requireBikes && (s.bikes_available ?? 0) <= 0) return false;
    if (requireDocks && (s.docks_available ?? 0) <= 0) return false;
    return true;
  });

  function dist2(aLat: number, aLon: number) {
    const dLat = aLat - lat;
    const dLon = aLon - lon;
    return dLat * dLat + dLon * dLon;
  }

  return filtered
    .sort((a, b) => dist2(a.lat, a.lon) - dist2(b.lat, b.lon))
    .slice(0, k);
}
