import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { BikeReservationCommand } from "@/lib/commands/ReservationCommand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    const user = await requireUser();

    const command = new BikeReservationCommand({
      userId: user.id,
      stationId: "",
      stationName: "",
    });

    const result = await command.undo();

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