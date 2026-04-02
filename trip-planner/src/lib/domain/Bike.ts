// +----------------------------------------------------------+
// ¦  LAYER:   Domain                                         ¦
// ¦  ENTITY:  Bike                                           ¦
// ¦  PURPOSE: Represents a real-world BIXI bike station      ¦
// ¦           and its availability state                     ¦
// +----------------------------------------------------------+

export class Bike {
  constructor(
    public readonly stationId: string,
    public readonly stationName: string,
    public available: number,
    public readonly lat: number,
    public readonly lon: number,
    public readonly provider: string = "BIXI"
  ) {}

  isAvailable(): boolean {
    return this.available > 0;
  }

  reserve(): void {
    if (!this.isAvailable()) throw new Error("No bikes available at this station.");
    this.available--;
  }

  returnBike(): void {
    this.available++;
  }
}
