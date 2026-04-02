// src/app/api/bikes/stations/route.ts
// PATTERN: Adapter
// Fetches the live GBFS feed once to seed any stations not yet in the local
// Vehicle table, then always serves from the DB. This means reserve/return
// operations (which write to Vehicle.available) are immediately reflected in
// the displayed counts without depending on the read-only external feed.

import { NextResponse } from "next/server";
import { getBixiStationsMerged } from "@/lib/technical-services/providers/gbfs";
import { prisma } from "@/lib/technical-services/persistence/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UiStation = {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  bikes_available: number;
  docks_available: number;
  is_installed: number;
  is_renting: number;
  is_returning: number;
  last_reported: number;
};

const MTL = {
  minLat: 45.35,
  maxLat: 45.75,
  minLon: -73.95,
  maxLon: -73.35,
};

function inMontreal(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= MTL.minLat &&
    lat <= MTL.maxLat &&
    lon >= MTL.minLon &&
    lon <= MTL.maxLon
  );
}

function hasValidCoords(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    !(lat === 0 && lon === 0)
  );
}

export async function GET() {
  try {
    // 1. Fetch live GBFS data
    const gbfsStations = await getBixiStationsMerged();

    // 2. Find which station IDs we already manage in the DB
    const existing = await prisma.vehicle.findMany({
      where: { type: "BIKE", stationId: { not: null } },
      select: { stationId: true },
    });
    const existingIds = new Set(existing.map((v) => v.stationId));

    // 3. Seed any GBFS stations we haven't seen before — never overwrite
    //    existing rows so our managed available counts are preserved
    const toSeed = gbfsStations
      .filter(
        (s) =>
          inMontreal(s.lat, s.lon) &&
          !existingIds.has(s.station_id)
      )
      .map((s) => ({
        name: s.name,
        type: "BIKE",
        provider: "BIXI",
        stationId: s.station_id,
        stationName: s.name,
        lat: s.lat,
        lon: s.lon,
        available: s.bikes_available ?? 0,
        status: "ACTIVE",
      }));

    if (toSeed.length > 0) {
      await prisma.vehicle.createMany({
        data: toSeed,
        // skipDuplicates: true,
      });
    }

    // 4. Serve everything from DB — counts are now fully under our control
    const allVehicles = await prisma.vehicle.findMany({
      where: {
        type: "BIKE",
        status: "ACTIVE",
        stationId: { not: null },
        stationName: { not: null },
        lat: { not: null },
        lon: { not: null },
      },
    });

    // 5. Enrich with GBFS metadata (is_installed, is_returning, etc.)
    //    that we don't store locally
    const gbfsById = new Map(gbfsStations.map((s) => [s.station_id, s]));

    const stations: UiStation[] = allVehicles
      .filter((v) => hasValidCoords(Number(v.lat), Number(v.lon)))
      .map((v) => {
        const gbfs = gbfsById.get(String(v.stationId));
        const bikes = Math.max(0, v.available ?? 0);
        const capacity = gbfs?.capacity ?? Math.max(bikes, bikes + 10);

        return {
          station_id: String(v.stationId),
          name: String(v.stationName),
          lat: Number(v.lat),
          lon: Number(v.lon),
          capacity,
          bikes_available: bikes,
          docks_available: Math.max(0, capacity - bikes),
          is_installed: gbfs?.is_installed ?? 1,
          is_renting: bikes > 0 ? 1 : 0,
          is_returning: gbfs?.is_returning ?? 1,
          last_reported:
            gbfs?.last_reported ?? Math.floor(Date.now() / 1000),
        };
      });

    stations.sort((a, b) => b.bikes_available - a.bikes_available);

    return NextResponse.json(
      { stations },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load bike stations." },
      { status: 502 }
    );
  }
}
