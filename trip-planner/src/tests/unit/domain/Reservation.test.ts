// UNIT TEST - Domain Layer
// Tests Reservation entity expiry logic.

import { Reservation } from '@/lib/domain/Reservation';

describe('Reservation entity', () => {
  describe('isExpired()', () => {
    it('returns false for a brand new reservation', () => {
      const res = new Reservation('r1', 'u1', 'bike', 'station-1', 'Milton', new Date());
      expect(res.isExpired()).toBe(false);
    });

    it('returns true for a reservation older than maxAgeHours', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const res = new Reservation('r2', 'u1', 'bike', 'station-1', 'Milton', threeHoursAgo);
      expect(res.isExpired(2)).toBe(true);
    });

    it('returns false within the time window', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const res = new Reservation('r3', 'u1', 'parking', 'p1', 'Place du Canada', oneHourAgo);
      expect(res.isExpired(2)).toBe(false);
    });
  });
});
