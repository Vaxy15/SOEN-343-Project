import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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

export async function GET() {
  const user = await getSessionUser();
  const isApprovedAdmin = user?.role === "ADMIN" && user?.status === "APPROVED";
  if (!isApprovedAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const from = addDays(startOfDay(now), -13); // last 14 days inclusive

  const [
    tripPlansTotal,
    bikeReservationsTotal,
    parkingReservationsTotal,

    // "Active" are current rows (your models are 1 active reservation per user)
    activeBikeReservations,
    activeParkingReservations,

    // recent rows for charts + lists
    recentTripPlansAll,
    recentBikeReservationsAll,
    recentParkingReservationsAll,

    // current bike stock for insight
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

  // Build day buckets for last 14 days
  const days: { day: string; tripPlans: number; bikeReservations: number; parkingReservations: number }[] = [];
  const map = new Map<string, { tripPlans: number; bikeReservations: number; parkingReservations: number }>();

  for (let i = 0; i < 14; i++) {
    const d = addDays(from, i);
    const key = dayKey(d);
    map.set(key, { tripPlans: 0, bikeReservations: 0, parkingReservations: 0 });
  }

  for (const t of recentTripPlansAll) {
    const key = dayKey(new Date(t.createdAt));
    const bucket = map.get(key);
    if (bucket) bucket.tripPlans++;
  }
  for (const b of recentBikeReservationsAll) {
    const key = dayKey(new Date(b.createdAt));
    const bucket = map.get(key);
    if (bucket) bucket.bikeReservations++;
  }
  for (const p of recentParkingReservationsAll) {
    const key = dayKey(new Date(p.createdAt));
    const bucket = map.get(key);
    if (bucket) bucket.parkingReservations++;
  }

  for (const [day, v] of map.entries()) {
    days.push({ day, ...v });
  }

  // Top stations / parking
  const topStations = (() => {
    const counts = new Map<string, { stationId: string; stationName: string; count: number }>();
    for (const r of recentBikeReservationsAll) {
      const key = r.stationId;
      const cur = counts.get(key) ?? { stationId: r.stationId, stationName: r.stationName, count: 0 };
      cur.count++;
      counts.set(key, cur);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const topParking = (() => {
    const counts = new Map<string, { parkingId: string; name: string; address: string; count: number }>();
    for (const r of recentParkingReservationsAll) {
      const key = r.parkingId;
      const cur = counts.get(key) ?? { parkingId: r.parkingId, name: r.name, address: r.address, count: 0 };
      cur.count++;
      counts.set(key, cur);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  // Recent lists (limit 10)
  const recent = {
    tripPlans: recentTripPlansAll.slice(-10).reverse(),
    bikeReservations: recentBikeReservationsAll.slice(-10).reverse(),
    parkingReservations: recentParkingReservationsAll.slice(-10).reverse(),
  };

  // Basic actionable insights (simple heuristics)
  const insights: { type: "info" | "warning" | "success"; title: string; detail: string }[] = [];

  const totalLast14Trips = recentTripPlansAll.length;
  const totalLast14Bike = recentBikeReservationsAll.length;
  const totalLast14Parking = recentParkingReservationsAll.length;

  if ((stockRow?.available ?? 0) <= 2) {
    insights.push({
      type: "warning",
      title: "Bike stock is low",
      detail: `Global reservable bike stock is ${stockRow?.available ?? 0}. Consider resetting BikeStock or increasing it for testing.`,
    });
  } else {
    insights.push({
      type: "success",
      title: "Bike stock OK",
      detail: `Global reservable bike stock is ${stockRow?.available ?? 0}.`,
    });
  }

  if (totalLast14Trips > 0 && totalLast14Bike === 0 && totalLast14Parking === 0) {
    insights.push({
      type: "info",
      title: "Plans aren’t converting to reservations",
      detail: "You have trip planning activity but no bike/parking reservations in the last 14 days. Consider adding clearer CTAs on Planner results.",
    });
  }

  if (topStations.length) {
    insights.push({
      type: "info",
      title: "Most reserved BIXI station (last 14 days)",
      detail: `${topStations[0].stationName} — ${topStations[0].count} reservations.`,
    });
  }

  if (topParking.length) {
    insights.push({
      type: "info",
      title: "Most reserved parking location (last 14 days)",
      detail: `${topParking[0].name} — ${topParking[0].count} reservations.`,
    });
  }

  return NextResponse.json({
    window: { days: 14, from: from.toISOString(), to: now.toISOString() },
    totals: {
      tripPlans: tripPlansTotal,
      bikeReservations: bikeReservationsTotal,
      parkingReservations: parkingReservationsTotal,
    },
    active: {
      bikeReservations: activeBikeReservations,
      parkingReservations: activeParkingReservations,
      bikeStockAvailable: stockRow?.available ?? 0,
    },
    timeseries: days, // [{day, tripPlans, bikeReservations, parkingReservations}]
    top: {
      stations: topStations,
      parking: topParking,
    },
    recent,
    insights,
  });
}