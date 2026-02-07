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
  for (const s of info?.data?.stations ?? []) infoById.set(s.station_id, s);

  const merged: GbfsStation[] = [];
  for (const st of status?.data?.stations ?? []) {
    const si = infoById.get(st.station_id);
    if (!si) continue;
    merged.push({
      station_id: st.station_id,
      name: si.name,
      lat: si.lat,
      lon: si.lon,
      capacity: si.capacity,
      bikes_available: st.num_bikes_available,
      docks_available: st.num_docks_available,
      is_installed: st.is_installed,
      is_renting: st.is_renting,
      is_returning: st.is_returning,
      last_reported: st.last_reported,
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
