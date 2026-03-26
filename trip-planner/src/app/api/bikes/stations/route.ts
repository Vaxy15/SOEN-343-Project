// src/app/api/bikes/stations/route.ts
// PATTERN: Adapter
// This route bridges the gap between the raw GBFS feed format and what the
// frontend needs. Instead of the browser fetching gbfs.velobixi.com directly,
// it calls this endpoint, which delegates to gbfs.ts — the adapter that
// normalizes inconsistent GBFS field names, handles missing availability data,
// and returns a clean GbfsStation[] shape the UI can rely on.
import { NextResponse } from "next/server";
import { getBixiStationsMerged } from "@/lib/providers/gbfs";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  try {
    const [bixiStations, customBikeStations] = await Promise.all([
      getBixiStationsMerged(),
      prisma.vehicle.findMany({
        where: {
          type: "BIKE",
          status: "ACTIVE",
          stationId: { not: null },
          stationName: { not: null },
          lat: { not: null },
          lon: { not: null },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const customStations: UiStation[] = customBikeStations.map((v) => {
      const bikes = Math.max(0, v.available ?? 0);
      const capacity = Math.max(bikes, bikes + 10);

      return {
        station_id: String(v.stationId),
        name: String(v.stationName),
        lat: Number(v.lat),
        lon: Number(v.lon),
        capacity,
        bikes_available: bikes,
        docks_available: Math.max(0, capacity - bikes),
        is_installed: 1,
        is_renting: bikes > 0 ? 1 : 0,
        is_returning: 1,
        last_reported: Math.floor(new Date(v.updatedAt).getTime() / 1000),
      };
    });

    const merged = [...bixiStations, ...customStations];

    merged.sort((a, b) => (b.bikes_available ?? 0) - (a.bikes_available ?? 0));

    return NextResponse.json(
      { stations: merged },
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