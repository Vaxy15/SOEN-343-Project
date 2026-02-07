import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBixiStationsMerged, nearestStations } from "@/lib/providers/gbfs";

type Body = {
  origin: { lat: number; lon: number; label?: string };
  destination: { lat: number; lon: number; label?: string };
  mode?: "transit" | "bixi" | "transit+bixi";
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const mode = body.mode ?? "transit+bixi";

  const stations = await getBixiStationsMerged();

const originNear = nearestStations(stations, body.origin.lat, body.origin.lon, 3, { requireBikes: true });
const destNear = nearestStations(stations, body.destination.lat, body.destination.lon, 3, { requireDocks: true });

  const plan = {
    mode,
    origin: body.origin,
    destination: body.destination,
    bixi: mode.includes("bixi")
      ? {
          pickupCandidates: originNear,
          dropoffCandidates: destNear,
          suggestedPickup: originNear[0] ?? null,
          suggestedDropoff: destNear[0] ?? null,
        }
      : null,
    // Phase 2: attach STM real-time info here (arrivals, disruptions, etc.)
    stm: null,
  };

  const saved = await prisma.tripPlan.create({
    data: {
      origin: body.origin.label ?? `${body.origin.lat},${body.origin.lon}`,
      destination: body.destination.label ?? `${body.destination.lat},${body.destination.lon}`,
      mode,
      resultJson: JSON.stringify(plan),
    },
  });

  return NextResponse.json({ tripId: saved.id, plan });
}
