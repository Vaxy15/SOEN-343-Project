// UNIT TEST - Technical Services Layer
// Tests the Factory pattern - OrderFactory creates correct order payloads.

import { OrderFactory } from '@/lib/technical-services/factories/OrderFactory';

describe('OrderFactory', () => {
  describe('createBikeOrder()', () => {
    it('creates a bike order with correct price', () => {
      const order = OrderFactory.createBikeOrder('user-1', {
        stationId: '123',
        stationName: 'Milton / Durocher',
      });
      expect(order.type).toBe('bike');
      expect(order.priceCents).toBe(499);
      expect(order.status).toBe('PAID');
      expect(order.userId).toBe('user-1');
    });

    it('serializes details to JSON', () => {
      const order = OrderFactory.createBikeOrder('user-1', {
        stationId: '123',
        stationName: 'Milton / Durocher',
      });
      const details = JSON.parse(order.detailsJson);
      expect(details.stationId).toBe('123');
      expect(details.stationName).toBe('Milton / Durocher');
    });
  });

  describe('createParkingOrder()', () => {
    it('creates a parking order with correct price', () => {
      const order = OrderFactory.createParkingOrder('user-2', {
        parkingId: 'p-1',
        name: 'Place du Canada',
        lat: 45.497,
        lon: -73.568,
      });
      expect(order.type).toBe('parking');
      expect(order.priceCents).toBe(1299);
      expect(order.status).toBe('PAID');
    });

    it('bike and parking prices are different', () => {
      const bike    = OrderFactory.createBikeOrder('u',    { stationId: '1', stationName: 'A' });
      const parking = OrderFactory.createParkingOrder('u', { parkingId: '1', name: 'B', lat: 0, lon: 0 });
      expect(bike.priceCents).not.toBe(parking.priceCents);
    });
  });
});
