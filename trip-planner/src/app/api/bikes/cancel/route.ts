// SOEN-343-Project\trip-planner\src\app\api\bikes\cancel\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

async function ensureStockRow() {
  const existing = await prisma.bikeStock.findUnique({ where: { id: "default" } });
  if (existing) return existing;

  return prisma.bikeStock.create({
    data: { id: "default", available: 20 },
  });
}

export async function POST() {
  try {
    const user = await requireUser();

    const result = await prisma.$transaction(async (tx) => {
      await ensureStockRow();

      const existing = await tx.bikeReservation.findUnique({
        where: { userId: user.id },
      });

      if (!existing) {
        return { ok: false as const, status: 404, error: "No reservation found." };
      }

      await tx.bikeReservation.delete({ where: { userId: user.id } });

      await tx.bikeStock.update({
        where: { id: "default" },
        data: { available: { increment: 1 } },
      });

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "FAILED";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
