// +----------------------------------------------------------+
// ¦  LAYER:   Domain                                         ¦
// ¦  ENTITY:  Trip                                           ¦
// ¦  PURPOSE: Represents a planned transit trip between      ¦
// ¦           an origin and destination in Montreal          ¦
// +----------------------------------------------------------+

export type TripMode = "transit" | "bixi" | "transit+bixi";

export type LatLon = { lat: number; lon: number; label?: string };

export class Trip {
  public readonly createdAt: Date;

  constructor(
    public readonly id: string,
    public readonly origin: LatLon,
    public readonly destination: LatLon,
    public readonly mode: TripMode,
    createdAt?: Date
  ) {
    this.createdAt = createdAt ?? new Date();
  }

  distanceKm(): number {
    const R = 6371;
    const dLat = ((this.destination.lat - this.origin.lat) * Math.PI) / 180;
    const dLon = ((this.destination.lon - this.origin.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((this.origin.lat * Math.PI) / 180) *
        Math.cos((this.destination.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
