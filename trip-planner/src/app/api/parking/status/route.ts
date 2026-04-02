import { NextResponse } from "next/server";
import { prisma } from "@/lib/technical-services/persistence/prisma";
import { getSessionUser } from "@/lib/technical-services/security/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    // public endpoint; just says no user/no reservation
    return NextResponse.json({
      user: null,
      reservation: null,
    });
  }

  const reservation = await prisma.parkingReservation.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      parkingId: true,
      name: true,
      address: true,
      lat: true,
      lon: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    reservation,
  });
}
