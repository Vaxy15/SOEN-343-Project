// SOEN-343-Project\trip-planner\src\app\api\bikes\reserve\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Body = { stationId: string; stationName: string };

async function ensureStockRow() {
  const existing = await prisma.bikeStock.findUnique({ where: { id: "default" } });
  if (existing) return existing;

  return prisma.bikeStock.create({
    data: { id: "default", available: 20 },
  });
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as Body;

    const stationId = String(body.stationId ?? "").trim();
    const stationName = String(body.stationName ?? "").trim();

    if (!stationId || !stationName) {
      return NextResponse.json({ error: "stationId and stationName are required." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await ensureStockRow();

      const existing = await tx.bikeReservation.findUnique({
        where: { userId: user.id },
      });

      if (existing) {
        return { ok: false as const, status: 409, error: "You already have a bike reserved (max 1)." };
      }

      const stock = await tx.bikeStock.findUnique({ where: { id: "default" } });
      if (!stock || stock.available <= 0) {
        return { ok: false as const, status: 409, error: "No reservable bikes available right now." };
      }

      await tx.bikeStock.update({
        where: { id: "default" },
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
