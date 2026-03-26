// src/app/api/payment/checkout/route.ts
// PATTERNS USED: Command, Factory
// Instead of inline if/else blocks that manually create reservations and orders,
// this route constructs the appropriate Command object and calls execute().
// The Command internally uses OrderFactory to build the order payload.
// To cancel a reservation, you would call command.undo().

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  BikeReservationCommand,
  ParkingReservationCommand,
} from "@/lib/commands/ReservationCommand";

type BikeBody = {
  type: "bike";
  stationId: string;
  stationName: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

type ParkingBody = {
  type: "parking";
  parkingId: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

type Body = BikeBody | ParkingBody;

function validPaymentFields(body: any) {
  return (
    String(body?.cardName ?? "").trim().length >= 2 &&
    String(body?.cardNumber ?? "").replace(/\s+/g, "").length >= 12 &&
    String(body?.expiry ?? "").trim().length >= 4 &&
    String(body?.cvv ?? "").trim().length >= 3
  );
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as Body;

    if (!validPaymentFields(body)) {
      return NextResponse.json({ error: "Invalid payment information." }, { status: 400 });
    }

    if (body.type === "bike") {
      const stationId = String(body.stationId ?? "").trim();
      const stationName = String(body.stationName ?? "").trim();

      if (!stationId || !stationName) {
        return NextResponse.json({ error: "Missing bike reservation details." }, { status: 400 });
      }

      // PATTERN: Command — construct and execute
      const command = new BikeReservationCommand({ userId: user.id, stationId, stationName });
      const result = await command.execute();

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ ok: true, orderId: result.orderId });
    }

    if (body.type === "parking") {
      const parkingId = String(body.parkingId ?? "").trim();
      const name = String(body.name ?? "").trim();
      const address = String(body.address ?? "");
      const lat = Number(body.lat);
      const lon = Number(body.lon);

      if (!parkingId || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return NextResponse.json({ error: "Missing parking reservation details." }, { status: 400 });
      }

      // PATTERN: Command — construct and execute
      const command = new ParkingReservationCommand({
        userId: user.id,
        parkingId,
        name,
        address,
        lat,
        lon,
      });
      const result = await command.execute();

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ ok: true, orderId: result.orderId });
    }

    return NextResponse.json({ error: "Invalid checkout type." }, { status: 400 });
  } catch (e: any) {
    const msg = e?.message ?? "Checkout failed";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}