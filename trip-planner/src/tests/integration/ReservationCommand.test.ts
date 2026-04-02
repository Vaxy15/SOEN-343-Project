// INTEGRATION TEST - Technical Services Layer
// Tests BikeReservationCommand and ParkingReservationCommand against the real database.

import { prisma } from '@/lib/technical-services/persistence/prisma';
import {
  BikeReservationCommand,
  ParkingReservationCommand,
} from '@/lib/technical-services/commands/ReservationCommand';

const TEST_USER_ID = 'test-user-integration-' + Date.now();

beforeAll(async () => {
  await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: 'test-' + Date.now() + '@citycircuit.test',
      name: 'Test User',
      passwordHash: 'not-a-real-hash',
      role: 'USER',
      status: 'APPROVED',
    },
  });

  await prisma.bikeStock.upsert({
    where: { id: 'default' },
    update: { available: 20 },
    create: { id: 'default', available: 20 },
  });

  await prisma.vehicle.upsert({
    where: { id: 'test-vehicle-1' },
    update: { available: 10 },
    create: {
      id: 'test-vehicle-1',
      name: 'Test Station',
      type: 'BIKE',
      stationId: 'test-station-1',
      stationName: 'Test Station',
      lat: 45.508,
      lon: -73.574,
      available: 10,
      status: 'ACTIVE',
    },
  });
});

afterAll(async () => {
  await prisma.mockOrder.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.bikeReservation.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.parkingReservation.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.vehicle.deleteMany({ where: { stationId: 'test-station-1' } });
  await prisma.$disconnect();
});

describe('BikeReservationCommand integration', () => {
  it('execute() creates a reservation and order, decrements vehicle stock', async () => {
    const command = new BikeReservationCommand({
      userId: TEST_USER_ID,
      stationId: 'test-station-1',
      stationName: 'Test Station',
    });
    const result = await command.execute();
    expect(result.ok).toBe(true);
    expect(result.orderId).toBeDefined();

    const reservation = await prisma.bikeReservation.findUnique({ where: { userId: TEST_USER_ID } });
    expect(reservation).not.toBeNull();
    expect(reservation?.stationId).toBe('test-station-1');

    const vehicle = await prisma.vehicle.findFirst({ where: { stationId: 'test-station-1' } });
    expect(vehicle?.available).toBe(9);
  });

  it('execute() fails if reservation already exists', async () => {
    const command = new BikeReservationCommand({
      userId: TEST_USER_ID,
      stationId: 'test-station-1',
      stationName: 'Test Station',
    });
    const result = await command.execute();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('already have a bike');
  });

  it('undo() deletes the reservation and restores vehicle stock', async () => {
    const command = new BikeReservationCommand({
      userId: TEST_USER_ID,
      stationId: 'test-station-1',
      stationName: 'Test Station',
    });
    const result = await command.undo();
    expect(result.ok).toBe(true);

    const reservation = await prisma.bikeReservation.findUnique({ where: { userId: TEST_USER_ID } });
    expect(reservation).toBeNull();

    const vehicle = await prisma.vehicle.findFirst({ where: { stationId: 'test-station-1' } });
    expect(vehicle?.available).toBe(10);
  });
});

describe('ParkingReservationCommand integration', () => {
  it('execute() creates a parking reservation and order', async () => {
    const command = new ParkingReservationCommand({
      userId: TEST_USER_ID,
      parkingId: 'test-parking-1',
      name: 'Place du Canada',
      address: '1000 de la Gauchetiere',
      lat: 45.497,
      lon: -73.568,
    });
    const result = await command.execute();
    expect(result.ok).toBe(true);
    expect(result.orderId).toBeDefined();

    const reservation = await prisma.parkingReservation.findUnique({ where: { userId: TEST_USER_ID } });
    expect(reservation).not.toBeNull();
    expect(reservation?.parkingId).toBe('test-parking-1');
  });

  it('undo() removes the parking reservation', async () => {
    const command = new ParkingReservationCommand({
      userId: TEST_USER_ID,
      parkingId: 'test-parking-1',
      name: 'Place du Canada',
      lat: 45.497,
      lon: -73.568,
    });
    const result = await command.undo();
    expect(result.ok).toBe(true);

    const reservation = await prisma.parkingReservation.findUnique({ where: { userId: TEST_USER_ID } });
    expect(reservation).toBeNull();
  });
});
