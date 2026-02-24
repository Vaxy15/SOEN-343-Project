// SOEN-343-Project\trip-planner\src\app\api\parking\cancel.ts\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  }

  const existing = await prisma.parkingReservation.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: true, deleted: false });
  }

  await prisma.parkingReservation.delete({
    where: { userId: user.id },
  });

  return NextResponse.json({ ok: true, deleted: true });
}