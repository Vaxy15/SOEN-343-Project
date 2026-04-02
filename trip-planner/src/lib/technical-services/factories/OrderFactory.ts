// src/lib/orders.ts
// PATTERN: Factory
// OrderFactory centralizes the creation of MockOrder data objects.
// Instead of constructing order payloads inline across multiple route handlers,
// all order creation goes through this factory, ensuring consistent structure,
// pricing, and serialization.

export type OrderType = "bike" | "parking";

export type OrderPayload = {
  userId: string;
  type: OrderType;
  priceCents: number;
  status: string;
  detailsJson: string;
};

export type BikeOrderDetails = {
  reservationId?: string;
  stationId: string;
  stationName: string;
};

export type ParkingOrderDetails = {
  reservationId?: string;
  parkingId: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
};

export class OrderFactory {
  /**
   * Creates the data payload for a bike reservation order.
   * Price is fixed at $4.99.
   */
  static createBikeOrder(userId: string, details: BikeOrderDetails): OrderPayload {
    return {
      userId,
      type: "bike",
      priceCents: 499,
      status: "PAID",
      detailsJson: JSON.stringify(details),
    };
  }

  /**
   * Creates the data payload for a parking reservation order.
   * Price is fixed at $12.99.
   */
  static createParkingOrder(userId: string, details: ParkingOrderDetails): OrderPayload {
    return {
      userId,
      type: "parking",
      priceCents: 1299,
      status: "PAID",
      detailsJson: JSON.stringify(details),
    };
  }
}
