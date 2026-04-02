// +----------------------------------------------------------+
// ¦  LAYER:   Domain                                         ¦
// ¦  ENTITY:  Reservation                                    ¦
// ¦  PURPOSE: Represents a user's active reservation         ¦
// ¦           for either a bike or a parking spot            ¦
// +----------------------------------------------------------+

export type ReservationType = "bike" | "parking";

export class Reservation {
  public readonly createdAt: Date;

  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: ReservationType,
    public readonly resourceId: string,
    public readonly resourceName: string,
    createdAt?: Date
  ) {
    this.createdAt = createdAt ?? new Date();
  }

  isExpired(maxAgeHours = 2): boolean {
    const ageMs = Date.now() - this.createdAt.getTime();
    return ageMs > maxAgeHours * 60 * 60 * 1000;
  }
}
