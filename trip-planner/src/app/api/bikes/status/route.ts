// SOEN-343-Project\trip-planner\src\app\api\bikes\status\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

async function ensureStockRow() {
  const existing = await prisma.bikeStock.findUnique({ where: { id: "default" } });
  if (existing) return existing;

  // default stock if DB newly migrated
  return prisma.bikeStock.create({
    data: { id: "default", available: 20 },
  });
}

export async function GET() {
  const user = await getSessionUser();
  const stock = await ensureStockRow();

  const reservation = user
    ? await prisma.bikeReservation.findUnique({
        where: { userId: user.id },
        select: { id: true, stationId: true, stationName: true, createdAt: true },
      })
    : null;

  return NextResponse.json({
    available: stock.available,
    reservation,
    user: user ? { id: user.id, email: user.email, name: user.name } : null,
  });
}
