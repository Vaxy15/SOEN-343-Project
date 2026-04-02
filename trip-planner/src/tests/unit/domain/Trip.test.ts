// UNIT TEST - Domain Layer
// Tests Trip distance calculation logic.

import { Trip } from '@/lib/domain/Trip';

describe('Trip entity', () => {
  describe('distanceKm()', () => {
    it('returns 0 for same origin and destination', () => {
      const trip = new Trip('t1',
        { lat: 45.5019, lon: -73.5674 },
        { lat: 45.5019, lon: -73.5674 },
        'transit'
      );
      expect(trip.distanceKm()).toBeCloseTo(0, 2);
    });

    it('returns a reasonable distance for two Montreal locations', () => {
      const trip = new Trip('t2',
        { lat: 45.5048, lon: -73.5772, label: 'McGill University' },
        { lat: 45.5076, lon: -73.5539, label: 'Old Montreal' },
        'transit'
      );
      const dist = trip.distanceKm();
      expect(dist).toBeGreaterThan(1);
      expect(dist).toBeLessThan(5);
    });
  });
});
