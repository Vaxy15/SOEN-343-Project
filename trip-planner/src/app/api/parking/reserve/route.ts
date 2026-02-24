import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  parkingId: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
};

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  }

  const body = (await req.json()) as Body;

  if (
    !body?.parkingId ||
    !body?.name ||
    !Number.isFinite(body.lat) ||
    !Number.isFinite(body.lon)
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const existing = await prisma.parkingReservation.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active parking reservation." },
      { status: 409 }
    );
  }

  const saved = await prisma.parkingReservation.create({
    data: {
      userId: user.id,
      parkingId: String(body.parkingId),
      name: String(body.name),
      address: String(body.address ?? ""),
      lat: body.lat,
      lon: body.lon,
    },
  });

  return NextResponse.json({ ok: true, reservationId: saved.id });
}