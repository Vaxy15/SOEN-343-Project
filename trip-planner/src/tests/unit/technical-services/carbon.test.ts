// UNIT TEST - Technical Services Layer
// Tests carbon savings calculations.

import {
  bikeSavingsGrams,
  transitSavingsGrams,
  formatCO2,
  carbonEquivalents,
} from '@/lib/technical-services/services/carbon';

describe('Carbon service', () => {
  describe('bikeSavingsGrams()', () => {
    it('returns 0 for 0 trips', () => {
      expect(bikeSavingsGrams(0)).toBe(0);
    });
    it('returns correct savings for 1 bike trip (170 g/km * 2.5 km = 425 g)', () => {
      expect(bikeSavingsGrams(1)).toBe(425);
    });
    it('scales linearly with number of trips', () => {
      expect(bikeSavingsGrams(4)).toBe(bikeSavingsGrams(1) * 4);
    });
  });

  describe('transitSavingsGrams()', () => {
    it('returns correct savings for 1 transit trip ((170-45) g/km * 6 km = 750 g)', () => {
      expect(transitSavingsGrams(1)).toBe(750);
    });
  });

  describe('formatCO2()', () => {
    it('formats grams below 1000 as g', () => {
      expect(formatCO2(425)).toBe('425 g');
    });
    it('formats grams above 1000 as kg', () => {
      expect(formatCO2(1500)).toBe('1.50 kg');
    });
    it('formats very large amounts as tonnes', () => {
      expect(formatCO2(2000000)).toBe('2.00 t');
    });
  });

  describe('carbonEquivalents()', () => {
    it('returns correct km not driven', () => {
      const eq = carbonEquivalents(1700);
      expect(eq.kmNotDriven).toBe(10);
    });
    it('returns non-negative values for zero input', () => {
      const eq = carbonEquivalents(0);
      expect(eq.kmNotDriven).toBeGreaterThanOrEqual(0);
      expect(eq.phoneCharges).toBeGreaterThanOrEqual(0);
      expect(eq.treeDays).toBeGreaterThanOrEqual(0);
    });
  });
});
