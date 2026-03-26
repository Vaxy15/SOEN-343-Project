import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Body = { stationId: string; stationName: string };

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as Body;

    const stationId = String(body.stationId ?? "").trim();
    const stationName = String(body.stationName ?? "").trim();

    if (!stationId || !stationName) {
      return NextResponse.json(
        { error: "stationId and stationName are required." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.bikeReservation.findUnique({
        where: { userId: user.id },
      });

      if (existing) {
        return {
          ok: false as const,
          status: 409,
          error: "You already have a bike reserved (max 1).",
        };
      }

      const customStationVehicle = await tx.vehicle.findFirst({
        where: {
          type: "BIKE",
          status: "ACTIVE",
          stationId,
        },
        orderBy: { createdAt: "asc" },
      });

      if (customStationVehicle) {
        if ((customStationVehicle.available ?? 0) <= 0) {
          return {
            ok: false as const,
            status: 409,
            error: "No reservable bikes available at this station.",
          };
        }

        await tx.vehicle.update({
          where: { id: customStationVehicle.id },
          data: { available: { decrement: 1 } },
        });

        const reservation = await tx.bikeReservation.create({
          data: {
            userId: user.id,
            stationId,
            stationName,
          },
          select: { id: true, stationId: true, stationName: true, createdAt: true },
        });

        return { ok: true as const, reservation };
      }

      // Fallback for regular external BIXI stations already shown on the map.
      const reservation = await tx.bikeReservation.create({
        data: {
          userId: user.id,
          stationId,
          stationName,
        },
        select: { id: true, stationId: true, stationName: true, createdAt: true },
      });

      return { ok: true as const, reservation };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ reservation: result.reservation });
  } catch (e: any) {
    const msg = e?.message ?? "FAILED";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}