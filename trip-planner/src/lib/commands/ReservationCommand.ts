// src/lib/commands/ReservationCommand.ts
// PATTERN: Command
// Each reservation type (bike, parking) is encapsulated as a Command object
// with execute() and undo() methods. This pairs the reserve and cancel operations
// that conceptually belong together, and makes it easy to add audit logging,
// queuing, or undo history in the future.

import { prisma } from "@/lib/prisma";
import { OrderFactory } from "@/lib/orders";

export interface ReservationCommand {
  execute(): Promise<{ ok: boolean; error?: string; orderId?: string }>;
  undo(): Promise<{ ok: boolean; error?: string }>;
}

// ---------------------------------------------------------------------------
// BikeReservationCommand
// ---------------------------------------------------------------------------

type BikeCommandOptions = {
  userId: string;
  stationId: string;
  stationName: string;
};

export class BikeReservationCommand implements ReservationCommand {
  constructor(private opts: BikeCommandOptions) {}

  async execute() {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Ensure stock row exists
        const existingStock = await tx.bikeStock.findUnique({ where: { id: "default" } });
        if (!existingStock) {
          await tx.bikeStock.create({ data: { id: "default", available: 20 } });
        }

        const existing = await tx.bikeReservation.findUnique({
          where: { userId: this.opts.userId },
        });
        if (existing) throw new Error("You already have a bike reserved.");

        const stock = await tx.bikeStock.findUnique({ where: { id: "default" } });
        if (!stock || stock.available <= 0) {
          throw new Error("No reservable bikes available right now.");
        }

        const reservation = await tx.bikeReservation.create({
          data: {
            userId: this.opts.userId,
            stationId: this.opts.stationId,
            stationName: this.opts.stationName,
          },
        });

        await tx.bikeStock.update({
          where: { id: "default" },
          data: { available: { decrement: 1 } },
        });

        // Use OrderFactory to build the order payload
        const orderData = OrderFactory.createBikeOrder(this.opts.userId, {
          reservationId: reservation.id,
          stationId: this.opts.stationId,
          stationName: this.opts.stationName,
        });

        const order = await tx.mockOrder.create({
          data: orderData,
          select: { id: true },
        });

        return order;
      });

      return { ok: true, orderId: result.id };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Bike reservation failed." };
    }
  }

  async undo() {
    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.bikeReservation.findUnique({
          where: { userId: this.opts.userId },
        });
        if (!existing) throw new Error("No reservation found.");

        await tx.bikeReservation.delete({ where: { userId: this.opts.userId } });
        await tx.bikeStock.update({
          where: { id: "default" },
          data: { available: { increment: 1 } },
        });
      });

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Cancel failed." };
    }
  }
}

// ---------------------------------------------------------------------------
// ParkingReservationCommand
// ---------------------------------------------------------------------------

type ParkingCommandOptions = {
  userId: string;
  parkingId: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
};

export class ParkingReservationCommand implements ReservationCommand {
  constructor(private opts: ParkingCommandOptions) {}

  async execute() {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.parkingReservation.findUnique({
          where: { userId: this.opts.userId },
        });
        if (existing) throw new Error("You already have an active parking reservation.");

        const reservation = await tx.parkingReservation.create({
          data: {
            userId: this.opts.userId,
            parkingId: this.opts.parkingId,
            name: this.opts.name,
            address: this.opts.address ?? "",
            lat: this.opts.lat,
            lon: this.opts.lon,
          },
        });

        // Use OrderFactory to build the order payload
        const orderData = OrderFactory.createParkingOrder(this.opts.userId, {
          reservationId: reservation.id,
          parkingId: this.opts.parkingId,
          name: this.opts.name,
          address: this.opts.address,
          lat: this.opts.lat,
          lon: this.opts.lon,
        });

        const order = await tx.mockOrder.create({
          data: orderData,
          select: { id: true },
        });

        return order;
      });

      return { ok: true, orderId: result.id };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Parking reservation failed." };
    }
  }

  async undo() {
    try {
      const existing = await prisma.parkingReservation.findUnique({
        where: { userId: this.opts.userId },
        select: { id: true },
      });

      if (!existing) return { ok: true }; // nothing to undo

      await prisma.parkingReservation.delete({ where: { userId: this.opts.userId } });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Cancel failed." };
    }
  }
}