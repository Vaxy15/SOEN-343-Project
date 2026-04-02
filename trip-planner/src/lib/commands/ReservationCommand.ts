// src/lib/commands/ReservationCommand.ts
// PATTERN: Command
// Each reservation type (bike, parking) is encapsulated as a Command object
// with execute() and undo() methods. This pairs the reserve and cancel operations
// that conceptually belong together, and makes it easy to add audit logging,
// queuing, or undo history in the future.
//
// Since all stations (BIXI and custom) are now seeded into the Vehicle table,
// availability is always managed via Vehicle.available. BikeStock is no longer
// used as a fallback.

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
        // Block duplicate reservations
        const existing = await tx.bikeReservation.findUnique({
          where: { userId: this.opts.userId },
        });
        if (existing) throw new Error("You already have a bike reserved.");

        // All stations are in Vehicle — find by stationId
        const vehicle = await tx.vehicle.findFirst({
          where: {
            type: "BIKE",
            status: "ACTIVE",
            stationId: this.opts.stationId,
          },
          orderBy: { createdAt: "asc" },
        });

        if (!vehicle) {
          throw new Error("Station not found.");
        }

        if ((vehicle.available ?? 0) <= 0) {
          throw new Error("No bikes available at this station.");
        }

        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { available: { decrement: 1 } },
        });

        const reservation = await tx.bikeReservation.create({
          data: {
            userId: this.opts.userId,
            stationId: this.opts.stationId,
            stationName: this.opts.stationName,
          },
        });

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

        const vehicle = await tx.vehicle.findFirst({
          where: {
            type: "BIKE",
            stationId: existing.stationId,
          },
          orderBy: { createdAt: "asc" },
        });

        if (vehicle) {
          await tx.vehicle.update({
            where: { id: vehicle.id },
            data: { available: { increment: 1 } },
          });
        }

        await tx.bikeReservation.delete({
          where: { userId: this.opts.userId },
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
        if (existing)
          throw new Error("You already have an active parking reservation.");

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

      if (!existing) return { ok: true };

      await prisma.parkingReservation.delete({
        where: { userId: this.opts.userId },
      });

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Cancel failed." };
    }
  }
}