import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();

  const reservation = user
    ? await prisma.bikeReservation.findUnique({
        where: { userId: user.id },
        select: { id: true, stationId: true, stationName: true, createdAt: true },
      })
    : null;

  let available: number | null = null;

  if (reservation) {
    const customStationVehicle = await prisma.vehicle.findFirst({
      where: {
        type: "BIKE",
        stationId: reservation.stationId,
      },
      orderBy: { createdAt: "asc" },
      select: { available: true },
    });

    available = customStationVehicle?.available ?? null;
  }

  return NextResponse.json({
    available,
    reservation,
    user: user ? { id: user.id, email: user.email, name: user.name } : null,
  });
}