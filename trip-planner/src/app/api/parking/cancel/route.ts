// src/app/api/parking/cancel/route.ts
// PATTERN: Command
// Cancel is command.undo() — symmetric with execute() in the reserve flow.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/technical-services/security/session";
import { ParkingReservationCommand } from "@/lib/technical-services/commands/ReservationCommand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  }

  // stationId/name/coords not needed for undo (cancel looks up by userId)
  const command = new ParkingReservationCommand({
    userId: user.id,
    parkingId: "",
    name: "",
    lat: 0,
    lon: 0,
  });

  const result = await command.undo();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
