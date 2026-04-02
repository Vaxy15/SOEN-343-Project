// UNIT TEST - Domain Layer
// Tests the Bike entity in isolation. No database, no HTTP.

import { Bike } from '@/lib/domain/Bike';

describe('Bike entity', () => {
  let bike: Bike;

  beforeEach(() => {
    bike = new Bike('station-1', 'Milton / Durocher', 5, 45.508, -73.574);
  });

  describe('isAvailable()', () => {
    it('returns true when bikes are available', () => {
      expect(bike.isAvailable()).toBe(true);
    });

    it('returns false when available is 0', () => {
      const emptyBike = new Bike('station-2', 'Empty Station', 0, 45.5, -73.5);
      expect(emptyBike.isAvailable()).toBe(false);
    });
  });

  describe('reserve()', () => {
    it('decrements available count by 1', () => {
      bike.reserve();
      expect(bike.available).toBe(4);
    });

    it('throws when no bikes are available', () => {
      const emptyBike = new Bike('station-2', 'Empty Station', 0, 45.5, -73.5);
      expect(() => emptyBike.reserve()).toThrow('No bikes available');
    });

    it('allows reserving the last bike', () => {
      const lastBike = new Bike('station-3', 'Last Bike', 1, 45.5, -73.5);
      lastBike.reserve();
      expect(lastBike.available).toBe(0);
      expect(lastBike.isAvailable()).toBe(false);
    });
  });

  describe('returnBike()', () => {
    it('increments available count by 1', () => {
      bike.reserve();
      bike.returnBike();
      expect(bike.available).toBe(5);
    });
  });
});
