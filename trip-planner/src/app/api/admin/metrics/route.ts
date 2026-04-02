// src/app/api/admin/metrics/route.ts
// PATTERN: Decorator
// The route handler is wrapped with withAdmin(), which decorates it with
// auth + role checking. The handler itself receives a guaranteed SessionUser
// and contains only business logic — no auth boilerplate.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/technical-services/persistence/prisma";
import { withAdmin } from "@/lib/technical-services/security/middleware";
import { SessionUser } from "@/lib/technical-services/security/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

async function handler(_req: Request, _user: SessionUser): Promise<Response> {
  const now = new Date();
  const from = addDays(startOfDay(now), -13);

  const [
    tripPlansTotal,
    bikeReservationsTotal,
    parkingReservationsTotal,
    activeBikeReservations,
    activeParkingReservations,
    recentTripPlansAll,
    recentBikeReservationsAll,
    recentParkingReservationsAll,
    stockRow,
  ] = await Promise.all([
    prisma.tripPlan.count(),
    prisma.bikeReservation.count(),
    prisma.parkingReservation.count(),
    prisma.bikeReservation.count(),
    prisma.parkingReservation.count(),
    prisma.tripPlan.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, origin: true, destination: true, mode: true },
    }),
    prisma.bikeReservation.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, stationId: true, stationName: true, userId: true },
    }),
    prisma.parkingReservation.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, parkingId: true, name: true, address: true, userId: true },
    }),
    prisma.bikeStock.findUnique({ where: { id: "default" }, select: { available: true } }),
  ]);

  const map = new Map<string, { tripPlans: number; bikeReservations: number; parkingReservations: number }>();
  for (let i = 0; i < 14; i++) {
    const d = addDays(from, i);
    map.set(dayKey(d), { tripPlans: 0, bikeReservations: 0, parkingReservations: 0 });
  }

  for (const t of recentTripPlansAll) {
    const b = map.get(dayKey(new Date(t.createdAt)));
    if (b) b.tripPlans++;
  }
  for (const b of recentBikeReservationsAll) {
    const bucket = map.get(dayKey(new Date(b.createdAt)));
    if (bucket) bucket.bikeReservations++;
  }
  for (const p of recentParkingReservationsAll) {
    const b = map.get(dayKey(new Date(p.createdAt)));
    if (b) b.parkingReservations++;
  }

  const days = [...map.entries()].map(([day, v]) => ({ day, ...v }));

  const topStations = (() => {
    const counts = new Map<string, { stationId: string; stationName: string; count: number }>();
    for (const r of recentBikeReservationsAll) {
      const cur = counts.get(r.stationId) ?? { stationId: r.stationId, stationName: r.stationName, count: 0 };
      cur.count++;
      counts.set(r.stationId, cur);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const topParking = (() => {
    const counts = new Map<string, { parkingId: string; name: string; address: string; count: number }>();
    for (const r of recentParkingReservationsAll) {
      const cur = counts.get(r.parkingId) ?? { parkingId: r.parkingId, name: r.name, address: r.address, count: 0 };
      cur.count++;
      counts.set(r.parkingId, cur);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const recent = {
    tripPlans: recentTripPlansAll.slice(-10).reverse(),
    bikeReservations: recentBikeReservationsAll.slice(-10).reverse(),
    parkingReservations: recentParkingReservationsAll.slice(-10).reverse(),
  };

  const insights: { type: "info" | "warning" | "success"; title: string; detail: string }[] = [];
  const totalLast14Trips = recentTripPlansAll.length;
  const totalLast14Bike = recentBikeReservationsAll.length;
  const totalLast14Parking = recentParkingReservationsAll.length;

  if ((stockRow?.available ?? 0) <= 2) {
    insights.push({ type: "warning", title: "Bike stock is low", detail: `Global reservable bike stock is ${stockRow?.available ?? 0}.` });
  } else {
    insights.push({ type: "success", title: "Bike stock OK", detail: `Global reservable bike stock is ${stockRow?.available ?? 0}.` });
  }

  if (totalLast14Trips > 0 && totalLast14Bike === 0 && totalLast14Parking === 0) {
    insights.push({ type: "info", title: "Plans aren't converting to reservations", detail: "You have trip planning activity but no bike/parking reservations in the last 14 days." });
  }

  if (topStations.length) {
    insights.push({ type: "info", title: "Most reserved BIXI station (last 14 days)", detail: `${topStations[0].stationName} — ${topStations[0].count} reservations.` });
  }

  if (topParking.length) {
    insights.push({ type: "info", title: "Most reserved parking location (last 14 days)", detail: `${topParking[0].name} — ${topParking[0].count} reservations.` });
  }

  return NextResponse.json({
    window: { days: 14, from: from.toISOString(), to: now.toISOString() },
    totals: { tripPlans: tripPlansTotal, bikeReservations: bikeReservationsTotal, parkingReservations: parkingReservationsTotal },
    active: { bikeReservations: activeBikeReservations, parkingReservations: activeParkingReservations, bikeStockAvailable: stockRow?.available ?? 0 },
    timeseries: days,
    top: { stations: topStations, parking: topParking },
    recent,
    insights,
  });
}

// PATTERN: Decorator applied here — handler is wrapped with withAdmin
export const GET = withAdmin(handler);
