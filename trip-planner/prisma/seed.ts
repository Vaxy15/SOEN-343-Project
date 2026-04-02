import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ----------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------
function dateAt(year: number, month: number, day: number, hour = 10) {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// All dates from Oct 1 2024 → Apr 9 2025
function buildDateRange() {
  const dates: Date[] = [];
  const start = dateAt(2024, 10, 1);
  const end = dateAt(2025, 4, 9);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ----------------------------------------------------------------
// Data constants
// ----------------------------------------------------------------
const BIXI_STATIONS = [
  { id: "10001", name: "Métro Mont-Royal / Rivard" },
  { id: "10002", name: "Métro Laurier / de Brébeuf" },
  { id: "10003", name: "Parc Lafontaine / Rachel" },
  { id: "10004", name: "Plateau / Saint-Denis" },
  { id: "10005", name: "Vieux-Port / de la Commune" },
  { id: "10006", name: "Rachel / de la Roche" },
  { id: "10007", name: "Duluth / Saint-Hubert" },
];

const PARKING_SPOTS = [
  { id: "p001", name: "Stationnement Vieux-Montréal", address: "100 Rue Saint-Paul O", lat: 45.5088, lon: -73.554 },
  { id: "p002", name: "Stationnement Centreville", address: "800 Rue de la Gauchetière O", lat: 45.4972, lon: -73.5673 },
  { id: "p003", name: "Palais des congrès Parking", address: "159 Rue Saint-Antoine O", lat: 45.5047, lon: -73.5607 },
  { id: "p004", name: "Stationnement Quartier Latin", address: "300 Rue Ontario E", lat: 45.5162, lon: -73.5688 },
];

const TRIP_ROUTES = [
  { origin: "McGill University, Montréal", destination: "Plateau Mont-Royal, Montréal" },
  { origin: "Gare Centrale, Montréal", destination: "Marché Jean-Talon, Montréal" },
  { origin: "Vieux-Port de Montréal", destination: "Université de Montréal" },
  { origin: "Mile End, Montréal", destination: "Vieux-Montréal" },
  { origin: "Rosemont, Montréal", destination: "Centre-ville, Montréal" },
  { origin: "Métro Lionel-Groulx", destination: "Parc Lafontaine, Montréal" },
  { origin: "NDG, Montréal", destination: "McGill University, Montréal" },
  { origin: "Longueuil, QC", destination: "Montréal, QC" },
  { origin: "Laval, QC", destination: "Centre-ville, Montréal" },
  { origin: "Verdun, Montréal", destination: "Mile End, Montréal" },
];

// Realistic daily trip count shape — busier on weekdays, lighter on weekends,
// picks up in March/April as weather improves
function tripsForDate(d: Date): number {
  const dow = d.getDay(); // 0=Sun, 6=Sat
  const month = d.getMonth() + 1; // 1-based
  const isWeekend = dow === 0 || dow === 6;

  let base = isWeekend ? randomBetween(1, 3) : randomBetween(3, 7);

  // Boost spring months (March/April)
  if (month >= 3) base = Math.ceil(base * 1.4);
  // Slight dip in December/January
  if (month === 12 || month === 1) base = Math.max(1, Math.floor(base * 0.7));

  return base;
}

function bikesForDate(d: Date): number {
  const dow = d.getDay();
  const month = d.getMonth() + 1;
  const isWeekend = dow === 0 || dow === 6;

  // BIXI is seasonal — much less in winter
  if (month >= 11 || month <= 3) return randomBetween(0, 1);
  return isWeekend ? randomBetween(1, 3) : randomBetween(0, 2);
}

function parkingForDate(d: Date): number {
  const dow = d.getDay();
  const isWeekend = dow === 0 || dow === 6;
  return isWeekend ? randomBetween(1, 3) : randomBetween(0, 2);
}

async function main() {
  console.log("🌱 Seeding historical data (Oct 2024 → Apr 9 2025)...");

  const TARGET_EMAIL = "anthony.200115@gmail.com";

  // ----------------------------------------------------------------
  // Find the target user
  // ----------------------------------------------------------------
  const targetUser = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!targetUser) {
    throw new Error(`User ${TARGET_EMAIL} not found. Make sure you're logged in with this account first.`);
  }
  console.log(`✅ Found target user: ${targetUser.name ?? targetUser.email}`);

  // ----------------------------------------------------------------
  // Clean existing historical orders/reservations for this user
  // (keeps their current active reservations intact)
  // ----------------------------------------------------------------
  await prisma.mockOrder.deleteMany({ where: { userId: targetUser.id } });
  console.log("🧹 Cleared existing orders for target user");

  // ----------------------------------------------------------------
  // Create a pool of ghost users for global bike/parking reservations
  // (need unique userId per active reservation, so we use throwaway accounts)
  // ----------------------------------------------------------------
  const passwordHash = await bcrypt.hash("password123", 10);
  const GHOST_COUNT = 120; // enough for ~190 days * up to ~3/day

  // Remove old ghost users first
  await prisma.bikeReservation.deleteMany({
    where: { user: { email: { contains: "ghost" } } },
  });
  await prisma.parkingReservation.deleteMany({
    where: { user: { email: { contains: "ghost" } } },
  });
  await prisma.mockOrder.deleteMany({
    where: { user: { email: { contains: "ghost" } } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: "ghost" } } });

  const ghostUsers = await Promise.all(
    Array.from({ length: GHOST_COUNT }, (_, i) =>
      prisma.user.create({
        data: {
          name: `Ghost User ${i + 1}`,
          email: `ghost${i + 1}@demo.com`,
          passwordHash,
          role: "USER",
          status: "APPROVED",
        },
      })
    )
  );
  console.log(`✅ Created ${ghostUsers.length} ghost users for global stats`);

  // ----------------------------------------------------------------
  // Also delete and re-create trip plans for the full date range
  // (trip plans are not per-user so we can freely recreate them)
  // ----------------------------------------------------------------
  await prisma.tripPlan.deleteMany({
    where: {
      createdAt: {
        gte: dateAt(2024, 10, 1),
        lte: dateAt(2025, 4, 9, 23),
      },
    },
  });
  console.log("🧹 Cleared existing trip plans for date range");

  // ----------------------------------------------------------------
  // Walk through every day Oct 1 2024 → Apr 9 2025
  // ----------------------------------------------------------------
  const dates = buildDateRange();
  let tripTotal = 0;
  let bikeTotal = 0;
  let parkingTotal = 0;
  let ghostBikeIdx = 0;
  let ghostParkingIdx = 0;

  for (const date of dates) {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // ── Trip plans (global, no user) ──────────────────────────────
    const numTrips = tripsForDate(date);
    for (let j = 0; j < numTrips; j++) {
      const route = TRIP_ROUTES[(tripTotal + j) % TRIP_ROUTES.length];
      await prisma.tripPlan.create({
        data: {
          origin: route.origin,
          destination: route.destination,
          mode: "transit",
          resultJson: JSON.stringify({ mode: "transit" }),
          createdAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8 + j, randomBetween(0, 59)),
        },
      });
      tripTotal++;
    }

    // ── Bike reservations (global ghost users) ────────────────────
    const numBikes = bikesForDate(date);
    for (let j = 0; j < numBikes; j++) {
      if (ghostBikeIdx >= ghostUsers.length) break;
      const ghostUser = ghostUsers[ghostBikeIdx++];
      const station = BIXI_STATIONS[(bikeTotal + j) % BIXI_STATIONS.length];
      const createdAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9 + j, randomBetween(0, 59));

      const reservation = await prisma.bikeReservation.create({
        data: {
          userId: ghostUser.id,
          stationId: station.id,
          stationName: station.name,
          createdAt,
        },
      });

      await prisma.mockOrder.create({
        data: {
          userId: ghostUser.id,
          type: "bike",
          priceCents: 499,
          status: "PAID",
          detailsJson: JSON.stringify({ reservationId: reservation.id, stationId: station.id, stationName: station.name }),
          createdAt,
        },
      });

      bikeTotal++;
    }

    // ── Parking reservations (global ghost users) ─────────────────
    const numParking = parkingForDate(date);
    for (let j = 0; j < numParking; j++) {
      // Use ghost users offset from bike idx to avoid overlap
      const parkingGhostIdx = 60 + ghostParkingIdx; // starts at ghost user #61
      if (parkingGhostIdx >= ghostUsers.length) break;
      const ghostUser = ghostUsers[parkingGhostIdx];
      ghostParkingIdx++;

      const spot = PARKING_SPOTS[(parkingTotal + j) % PARKING_SPOTS.length];
      const createdAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10 + j, randomBetween(0, 59));

      const reservation = await prisma.parkingReservation.create({
        data: {
          userId: ghostUser.id,
          parkingId: spot.id,
          name: spot.name,
          address: spot.address,
          lat: spot.lat,
          lon: spot.lon,
          createdAt,
        },
      });

      await prisma.mockOrder.create({
        data: {
          userId: ghostUser.id,
          type: "parking",
          priceCents: 1299,
          status: "PAID",
          detailsJson: JSON.stringify({ reservationId: reservation.id, parkingId: spot.id, name: spot.name, address: spot.address }),
          createdAt,
        },
      });

      parkingTotal++;
    }

    // ── Target user personal orders ───────────────────────────────
    // Bike: roughly 2-3x/month Oct-Nov, then picks up in March/April
    const userBikeChance =
      month >= 3 ? 0.18 :
      month >= 11 ? 0.04 :
      0.08;

    if (Math.random() < userBikeChance) {
      const station = BIXI_STATIONS[day % BIXI_STATIONS.length];
      const createdAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, randomBetween(0, 59));

      await prisma.mockOrder.create({
        data: {
          userId: targetUser.id,
          type: "bike",
          priceCents: 499,
          status: "PAID",
          detailsJson: JSON.stringify({ stationId: station.id, stationName: station.name }),
          createdAt,
        },
      });
    }

    // Parking: fairly consistent, ~5-6x/month
    const userParkingChance = 0.17;

    if (Math.random() < userParkingChance) {
      const spot = PARKING_SPOTS[day % PARKING_SPOTS.length];
      const createdAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, randomBetween(0, 59));

      await prisma.mockOrder.create({
        data: {
          userId: targetUser.id,
          type: "parking",
          priceCents: 1299,
          status: "PAID",
          detailsJson: JSON.stringify({ parkingId: spot.id, name: spot.name, address: spot.address, lat: spot.lat, lon: spot.lon }),
          createdAt,
        },
      });
    }
  }

  // ----------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------
  const userOrders = await prisma.mockOrder.count({ where: { userId: targetUser.id } });
  const userBikeOrders = await prisma.mockOrder.count({ where: { userId: targetUser.id, type: "bike" } });
  const userParkingOrders = await prisma.mockOrder.count({ where: { userId: targetUser.id, type: "parking" } });

  console.log(`\n✅ Global trip plans created: ${tripTotal}`);
  console.log(`✅ Global bike reservations created: ${bikeTotal}`);
  console.log(`✅ Global parking reservations created: ${parkingTotal}`);
  console.log(`\n✅ Personal orders for ${TARGET_EMAIL}:`);
  console.log(`   Bike orders:    ${userBikeOrders}`);
  console.log(`   Parking orders: ${userParkingOrders}`);
  console.log(`   Total:          ${userOrders}`);
  console.log("\n🎉 Historical seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });