export const CARBON = {
  CAR_G_PER_KM: 170,
  TRANSIT_G_PER_KM: 45,
  BIKE_G_PER_KM: 0,
  AVG_BIXI_KM: 2.5,
  AVG_TRANSIT_KM: 6.0,
} as const;

export function bikeSavingsGrams(numTrips: number): number {
  return (CARBON.CAR_G_PER_KM - CARBON.BIKE_G_PER_KM) * CARBON.AVG_BIXI_KM * numTrips;
}

export function transitSavingsGrams(numTrips: number): number {
  return (CARBON.CAR_G_PER_KM - CARBON.TRANSIT_G_PER_KM) * CARBON.AVG_TRANSIT_KM * numTrips;
}

export function formatCO2(grams: number): string {
  if (grams >= 1_000_000) return `${(grams / 1_000_000).toFixed(2)} t`;
  if (grams >= 1_000) return `${(grams / 1_000).toFixed(2)} kg`;
  return `${Math.round(grams)} g`;
}

export type CarbonEquivalents = {
  kmNotDriven: number;
  phoneCharges: number;
  treeDays: number;
};

export function carbonEquivalents(totalGrams: number): CarbonEquivalents {
  return {
    kmNotDriven:  parseFloat((totalGrams / CARBON.CAR_G_PER_KM).toFixed(1)),
    phoneCharges: Math.round(totalGrams / 8.22),
    treeDays:     parseFloat((totalGrams / (21_000 / 365)).toFixed(1)),
  };
}