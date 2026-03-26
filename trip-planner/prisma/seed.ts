import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number, hourOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hourOffset, 0, 0, 0);
  return d;
}

const BIXI_STATIONS = [
  { id: "10001", name: "Métro Mont-Royal / Rivard" },
  { id: "10002", name: "Métro Laurier / de Brébeuf" },
  { id: "10003", name: "Parc Lafontaine / Rachel" },
  { id: "10004", name: "Plateau / Saint-Denis" },
  { id: "10005", name: "Vieux-Port / de la Commune" },
];

const PARKING_SPOTS = [
  { id: "p001", name: "Stationnement Vieux-Montréal", address: "100 Rue Saint-Paul O, Montréal", lat: 45.5088, lon: -73.5540 },
  { id: "p002", name: "Stationnement Centreville", address: "800 Rue de la Gauchetière O", lat: 45.4972, lon: -73.5673 },
  { id: "p003", name: "Palais des congrès Parking", address: "159 Rue Saint-Antoine O", lat: 45.5047, lon: -73.5607 },
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
];

// bikeCounts sum = 22, parkingCounts sum = 15 → need 37 non-overlapping users
const BIKE_USER_NAMES = [
  "alice", "bob", "carol", "david", "eve",
  "frank", "grace", "henry", "iris", "jack",
  "kate", "leo", "mia", "noah", "olivia",
  "paul", "quinn", "rose", "sam", "tina",
  "uma", "victor",
];

const PARKING_USER_NAMES = [
  "wendy", "xavier", "yara", "zoe", "aaron",
  "bella", "charlie", "diana", "ethan", "fiona",
  "george", "hannah", "ivan", "julia", "kevin",
];

async function main() {
  console.log("🌱 Seeding database...");

  // ----------------------------------------------------------------
  // Clean slate
  // ----------------------------------------------------------------
  await prisma.mockOrder.deleteMany();
  await prisma.bikeReservation.deleteMany();
  await prisma.parkingReservation.deleteMany();
  await prisma.tripPlan.deleteMany();
  await prisma.bikeStock.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: "demo" } } });

  // ----------------------------------------------------------------
  // Users
  // ----------------------------------------------------------------
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      name: "Admin Demo",
      email: "admin@demo.com",
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  await prisma.user.create({
    data: {
      name: "Pending Admin",
      email: "pending-admin@demo.com",
      passwordHash,
      role: "ADMIN",
      status: "PENDING",
    },
  });

  // Dedicated bike users (22 needed)
  const bikeUsers = await Promise.all(
    BIKE_USER_NAMES.map((name) =>
      prisma.user.create({
        data: {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email: `${name}@demo.com`,
          passwordHash,
          role: "USER",
          status: "APPROVED",
        },
      })
    )
  );

  // Dedicated parking users (15 needed, completely separate from bike users)
  const parkingUsers = await Promise.all(
    PARKING_USER_NAMES.map((name) =>
      prisma.user.create({
        data: {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email: `${name}@demo.com`,
          passwordHash,
          role: "USER",
          status: "APPROVED",
        },
      })
    )
  );

  console.log(`✅ Created ${bikeUsers.length + parkingUsers.length} users + admin + pending admin`);

  // ----------------------------------------------------------------
  // Bike stock
  // ----------------------------------------------------------------
  await prisma.bikeStock.create({
    data: { id: "default", available: 42 },
  });

  // ----------------------------------------------------------------
  // Custom vehicles
  // ----------------------------------------------------------------
  await prisma.vehicle.createMany({
    data: [
      {
        name: "BIXI Station — Atwater Market",
        type: "BIKE",
        provider: "BIXI Montréal",
        stationId: "custom-atwater",
        stationName: "Marché Atwater / Atwater",
        lat: 45.4741,
        lon: -73.5773,
        available: 8,
        status: "ACTIVE",
      },
      {
        name: "BIXI Station — Square Victoria",
        type: "BIKE",
        provider: "BIXI Montréal",
        stationId: "custom-victoria",
        stationName: "Square Victoria / McGill",
        lat: 45.5020,
        lon: -73.5625,
        available: 5,
        status: "ACTIVE",
      },
      {
        name: "BIXI Station — Parc Laurier",
        type: "BIKE",
        provider: "BIXI Montréal",
        stationId: "custom-laurier",
        stationName: "Parc Laurier / Fairmount",
        lat: 45.5275,
        lon: -73.5930,
        available: 0,
        status: "MAINTENANCE",
      },
    ],
  });

  console.log("✅ Created bike stock + 3 custom vehicles");

  // ----------------------------------------------------------------
  // Trip plans
  // ----------------------------------------------------------------
  const tripCounts = [2, 3, 1, 4, 5, 3, 2, 6, 4, 3, 5, 7, 4, 3];
  let tripTotal = 0;

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const count = tripCounts[13 - dayOffset];
    for (let j = 0; j < count; j++) {
      const route = TRIP_ROUTES[(dayOffset + j) % TRIP_ROUTES.length];
      await prisma.tripPlan.create({
        data: {
          origin: route.origin,
          destination: route.destination,
          mode: "transit",
          resultJson: JSON.stringify({ mode: "transit" }),
          createdAt: daysAgo(dayOffset, 8 + j * 2),
        },
      });
      tripTotal++;
    }
  }

  console.log(`✅ Created ${tripTotal} trip plans`);

  // ----------------------------------------------------------------
  // Bike reservations — each entry uses the next dedicated bike user
  // so the unique userId constraint is never hit
  // ----------------------------------------------------------------
  const bikeCounts = [1, 0, 1, 2, 1, 2, 1, 3, 2, 1, 2, 3, 2, 1]; // sums to 22
  let bikeUserIdx = 0;
  let bikeTotal = 0;

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const count = bikeCounts[13 - dayOffset];
    for (let j = 0; j < count; j++) {
      const user = bikeUsers[bikeUserIdx++];
      const station = BIXI_STATIONS[(dayOffset + j) % BIXI_STATIONS.length];
      const createdAt = daysAgo(dayOffset, 9 + j);

      const reservation = await prisma.bikeReservation.create({
        data: {
          userId: user.id,
          stationId: station.id,
          stationName: station.name,
          createdAt,
        },
      });

      await prisma.mockOrder.create({
        data: {
          userId: user.id,
          type: "bike",
          priceCents: 499,
          status: "PAID",
          detailsJson: JSON.stringify({
            reservationId: reservation.id,
            stationId: station.id,
            stationName: station.name,
          }),
          createdAt,
        },
      });

      bikeTotal++;
    }
  }

  console.log(`✅ Created ${bikeTotal} bike reservations + orders`);

  // ----------------------------------------------------------------
  // Parking reservations — uses separate dedicated parking users
  // ----------------------------------------------------------------
  const parkingCounts = [0, 1, 0, 1, 2, 1, 0, 2, 1, 2, 1, 2, 1, 1]; // sums to 15
  let parkingUserIdx = 0;
  let parkingTotal = 0;

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const count = parkingCounts[13 - dayOffset];
    for (let j = 0; j < count; j++) {
      const user = parkingUsers[parkingUserIdx++];
      const spot = PARKING_SPOTS[(dayOffset + j) % PARKING_SPOTS.length];
      const createdAt = daysAgo(dayOffset, 10 + j);

      const reservation = await prisma.parkingReservation.create({
        data: {
          userId: user.id,
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
          userId: user.id,
          type: "parking",
          priceCents: 1299,
          status: "PAID",
          detailsJson: JSON.stringify({
            reservationId: reservation.id,
            parkingId: spot.id,
            name: spot.name,
            address: spot.address,
            lat: spot.lat,
            lon: spot.lon,
          }),
          createdAt,
        },
      });

      parkingTotal++;
    }
  }

  console.log(`✅ Created ${parkingTotal} parking reservations + orders`);

  console.log("\n🎉 Seed complete! Demo credentials:");
  console.log("   Admin → admin@demo.com        / password123");
  console.log("   User  → alice@demo.com        / password123");
  console.log("   User  → wendy@demo.com        / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });