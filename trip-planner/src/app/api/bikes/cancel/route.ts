import { NextResponse } from "next/server";
import { requireUser } from "@/lib/technical-services/security/session";
import { prisma } from "@/lib/technical-services/persistence/prisma";

export async function POST() {
  try {
    const user = await requireUser();

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.bikeReservation.findUnique({
        where: { userId: user.id },
        select: { id: true, stationId: true, stationName: true },
      });

      if (!reservation) {
        return { ok: false as const, error: "No bike reservation found." };
      }

      const customStationVehicle = await tx.vehicle.findFirst({
        where: {
          type: "BIKE",
          stationId: reservation.stationId,
        },
        orderBy: { createdAt: "asc" },
      });

      if (customStationVehicle) {
        await tx.vehicle.update({
          where: { id: customStationVehicle.id },
          data: { available: { increment: 1 } },
        });
      }

      await tx.bikeReservation.delete({
        where: { userId: user.id },
      });

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "FAILED";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
