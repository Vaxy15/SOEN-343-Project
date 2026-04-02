// src/app/api/account/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  bikeSavingsGrams,
  transitSavingsGrams,
  formatCO2,
  carbonEquivalents,
} from "@/lib/carbon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function daysAgoFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const user = await requireUser();

    const last30 = daysAgoFromNow(29);

    const mostRecentOrder = await prisma.mockOrder.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    let windowEnd = new Date();
    let windowStart = last30;

    if (mostRecentOrder && mostRecentOrder.createdAt < last30) {
      windowEnd = new Date(mostRecentOrder.createdAt);
      windowEnd.setDate(windowEnd.getDate() + 1);
      windowStart = new Date(windowEnd);
      windowStart.setDate(windowStart.getDate() - 30);
    }

    const [allOrders, recentWindowOrders, bikeRes, parkingRes, tripPlanCount] =
      await Promise.all([
        prisma.mockOrder.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            priceCents: true,
            createdAt: true,
            detailsJson: true,
          },
        }),
        prisma.mockOrder.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: windowStart, lte: windowEnd },
          },
          select: { priceCents: true, type: true },
        }),
        prisma.bikeReservation.findUnique({
          where: { userId: user.id },
          select: { stationName: true, stationId: true },
        }),
        prisma.parkingReservation.findUnique({
          where: { userId: user.id },
          select: { name: true, parkingId: true },
        }),
        // Trip plans aren't tied to a user in the schema, so we use the
        // total count as a system-wide proxy shown on the carbon card.
        prisma.tripPlan.count(),
      ]);

    // ── All-time totals ────────────────────────────────────────────────────
    const totalSpentCents = allOrders.reduce((a, o) => a + o.priceCents, 0);
    const totalBikeOrders = allOrders.filter((o) => o.type === "bike").length;
    const totalParkingOrders = allOrders.filter((o) => o.type === "parking").length;

    // ── Recent window totals ───────────────────────────────────────────────
    const windowSpentCents = recentWindowOrders.reduce((a, o) => a + o.priceCents, 0);
    const windowBikeOrders = recentWindowOrders.filter((o) => o.type === "bike").length;
    const windowParkingOrders = recentWindowOrders.filter((o) => o.type === "parking").length;

    // ── Favourite station ──────────────────────────────────────────────────
    const stationCount = new Map<string, { name: string; count: number }>();
    for (const o of allOrders.filter((o) => o.type === "bike")) {
      const d = JSON.parse(o.detailsJson || "{}");
      const key = d.stationId ?? "unknown";
      const cur = stationCount.get(key) ?? { name: d.stationName ?? key, count: 0 };
      cur.count++;
      stationCount.set(key, cur);
    }
    const favStation =
      [...stationCount.values()].sort((a, b) => b.count - a.count)[0] ?? null;

    // ── Favourite parking ──────────────────────────────────────────────────
    const parkingCount = new Map<string, { name: string; count: number }>();
    for (const o of allOrders.filter((o) => o.type === "parking")) {
      const d = JSON.parse(o.detailsJson || "{}");
      const key = d.parkingId ?? "unknown";
      const cur = parkingCount.get(key) ?? { name: d.name ?? key, count: 0 };
      cur.count++;
      parkingCount.set(key, cur);
    }
    const favParking =
      [...parkingCount.values()].sort((a, b) => b.count - a.count)[0] ?? null;

    // ── Activity chart (30 days) ───────────────────────────────────────────
    const chartMap = new Map<string, { bikes: number; parking: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(windowEnd);
      d.setDate(d.getDate() - i);
      chartMap.set(dayKey(d), { bikes: 0, parking: 0 });
    }
    for (const o of allOrders) {
      const k = dayKey(new Date(o.createdAt));
      const bucket = chartMap.get(k);
      if (!bucket) continue;
      if (o.type === "bike") bucket.bikes++;
      if (o.type === "parking") bucket.parking++;
    }
    const chart = [...chartMap.entries()].map(([day, v]) => ({
      day: new Date(day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      Bikes: v.bikes,
      Parking: v.parking,
    }));

    // ── Recent orders (last 5) ─────────────────────────────────────────────
    const recent = allOrders.slice(0, 5).map((o) => {
      const d = JSON.parse(o.detailsJson || "{}");
      return {
        id: o.id,
        type: o.type,
        priceCents: o.priceCents,
        createdAt: o.createdAt,
        label:
          o.type === "bike" ? (d.stationName ?? "Bike") : (d.name ?? "Parking"),
      };
    });

    // ── Window label ───────────────────────────────────────────────────────
    const windowLabel = `${windowStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${new Date(windowEnd.getTime() - 86400000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;

    // ── Carbon savings ─────────────────────────────────────────────────────
    // Bike trips: each reservation = one round trip avoided by car.
    // Transit trips: we don't have per-user trip plans, so we use the count
    // of bike orders as a proxy (every bike user also tends to take transit).
    // This is clearly labelled in the UI as an estimate.
    const bikeCO2Grams = bikeSavingsGrams(totalBikeOrders);
    // Attribute transit savings only from explicit trip plans the system tracked.
    // Since TripPlan has no userId, we give each user a proportional share
    // based on their share of total orders. Falls back to 0 if no orders at all.
    const allOrdersCount = await prisma.mockOrder.count();
    const userShare = allOrdersCount > 0 ? totalBikeOrders / allOrdersCount : 0;
    const attributedTransitTrips = Math.round(tripPlanCount * userShare);
    const transitCO2Grams = transitSavingsGrams(attributedTransitTrips);
    const totalCO2Grams = bikeCO2Grams + transitCO2Grams;

    const carbon = {
      bikeTrips: totalBikeOrders,
      attributedTransitTrips,
      bikeSavingsGrams: bikeCO2Grams,
      transitSavingsGrams: transitCO2Grams,
      totalSavingsGrams: totalCO2Grams,
      formatted: formatCO2(totalCO2Grams),
      equivalents: carbonEquivalents(totalCO2Grams),
    };

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      allTime: {
        spentCents: totalSpentCents,
        bikes: totalBikeOrders,
        parking: totalParkingOrders,
        total: allOrders.length,
      },
      recentWindow: {
        label: windowLabel,
        spentCents: windowSpentCents,
        bikes: windowBikeOrders,
        parking: windowParkingOrders,
      },
      favourites: {
        station: favStation,
        parking: favParking,
      },
      activeReservations: {
        bike: bikeRes,
        parking: parkingRes,
      },
      chart,
      recent,
      carbon, // ← new
    });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 }
    );
  }
}