# CityCircuit

> Map it. Book it. Ride it.

CityCircuit is a smart urban mobility management system for Montreal. It lets users plan transit trips, reserve BIXI bikes, and book off-street parking — all in one place.

---

## Team Members
|Name                  | Student ID |
|:---------------------|----------|
| Anh Vi Mac           | 40252404 |
| Anthony Mastromonaco | 40077240 |
| Dylan Moos           | 40296816 |
| Mahdi Rahman         | 40282926 |
| Anthony Vaccaro      | 40214876 |

## Features

- **Trip Planner** — Real-time STM transit directions via Google Maps
- **BIXI Bike Reservation** — Live station availability seeded from the GBFS feed, fully manageable
- **Parking Reservation** — Off-street parking locations from the Agence de mobilité durable open dataset
- **Carbon Footprint Tracker** — CO₂ savings calculated per reservation vs. driving
- **Account Dashboard** — Spending history, activity charts, favourite stations
- **Admin Panel** — Metrics dashboard, vehicle management, admin approval workflow

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Next.js 16, React, Tailwind CSS |
| Application | Next.js API Routes |
| Domain | TypeScript — Command, Factory patterns |
| Technical Services | Prisma ORM, GBFS adapter, bcryptjs |
| Database | SQLite (via Prisma) |
| Maps | Google Maps JavaScript API |

---

## Getting Started
```bash
npm install
cp .env.example .env.local   # add your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure
```
src/
├── app/                        # UI Layer (pages) + Application Layer (API routes)
│   ├── [pages]/                # UI Layer — React components rendered in browser
│   └── api/                    # Application Layer — Next.js route handlers
│
└── lib/
    ├── domain/                 # Domain Layer — business logic and rules
    │   ├── commands/           # Command pattern
    │   ├── factories/          # Factory pattern
    │   └── services/           # Domain services (e.g. carbon calculations)
    │
    └── technical-services/     # Technical Services Layer
        ├── persistence/        # Singleton — Prisma ORM client
        ├── security/           # Decorator — auth middleware and session
        └── providers/          # Adapter — external data feeds (GBFS/STM)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full layered architecture breakdown.
See [DESIGN_PATTERNS.md](./DESIGN_PATTERNS.md) for design pattern documentation.