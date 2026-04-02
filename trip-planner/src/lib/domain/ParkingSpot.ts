// +----------------------------------------------------------+
// ¦  LAYER:   Domain                                         ¦
// ¦  ENTITY:  ParkingSpot                                    ¦
// ¦  PURPOSE: Represents a real-world off-street parking     ¦
// ¦           location in Montreal                           ¦
// +----------------------------------------------------------+

export class ParkingSpot {
  constructor(
    public readonly parkingId: string,
    public readonly name: string,
    public readonly address: string,
    public readonly lat: number,
    public readonly lon: number
  ) {}

  getLabel(): string {
    return this.address ? this.name + " - " + this.address : this.name;
  }
}
