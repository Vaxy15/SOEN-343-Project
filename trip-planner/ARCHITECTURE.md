# Architecture — CityCircuit

## Overview

CityCircuit follows a **Layered Architecture** as defined in Larman's *Applying UML and Patterns*
and as taught in SOEN 343. The system is divided into four horizontal layers. Each layer only
depends on the layer directly below it. The UI layer never accesses the database — only the
Technical Services layer may do so.

> **Architecture Decision AD-1:** Only the Application and Technical Services layers may call
> Prisma directly. The UI layer must never access the database.

---

## Layer Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                        UI LAYER                             │
│  src/app/[pages]/   src/components/                         │
│                                                             │
│  React pages and components rendered in the browser.        │
│  No business logic. Delegates all actions via HTTP fetch.   │
│                                                             │
│  planner/page.tsx  rent/page.tsx  parking/page.tsx          │
│  account/page.tsx  NavBar.tsx     UserMenu.tsx              │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP fetch()
┌────────────────────────────▼────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  src/app/api/                                               │
│                                                             │
│  Next.js API route handlers. Validates requests, applies    │
│  the Decorator pattern for auth, and delegates business     │
│  operations to the Technical Services layer.                │
│                                                             │
│  api/payment/checkout  api/bikes/reserve  api/admin/        │
└────────────────────────────┬────────────────────────────────┘
                             │ instantiates / uses
┌────────────────────────────▼────────────────────────────────┐
│                      DOMAIN LAYER                           │
│  src/lib/domain/                                            │
│                                                             │
│  Real-world entities with identity and behaviour.           │
│  These are the core concepts of the urban mobility system.  │
│                                                             │
│  Bike.ts         — bike station, availability logic         │
│  ParkingSpot.ts  — parking location, label formatting       │
│  Reservation.ts  — active booking, expiry logic             │
│  Trip.ts         — planned journey, distance calculation    │
│  User.ts         — user identity, role and permission logic │
└────────────────────────────┬────────────────────────────────┘
                             │ supported by
┌────────────────────────────▼────────────────────────────────┐
│                 TECHNICAL SERVICES LAYER                    │
│  src/lib/technical-services/                                │
│                                                             │
│  Reusable infrastructure shared across the whole system.    │
│                                                             │
│  persistence/  — Prisma ORM client   (Singleton pattern)   │
│  security/     — Auth + session      (Decorator pattern)   │
│  providers/    — GBFS feed adapter   (Adapter pattern)     │
│  commands/     — Reservation ops     (Command pattern)     │
│  factories/    — Order creation      (Factory pattern)     │
│  services/     — Carbon calculation  (Service)             │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                       DATA LAYER                            │
│                                                             │
│  SQLite database managed by Prisma                          │
│  External: GBFS API (BIXI), Google Maps API, AMD CSV        │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### UI Layer — `src/app/[pages]/` and `src/components/`
Everything the user sees. Built with React and Tailwind CSS. Pages fetch data from the
Application layer via HTTP and render it. Contains no business logic — it is purely
presentational.

### Application Layer — `src/app/api/`
Next.js API route handlers. Each route receives an HTTP request, validates inputs, applies the
Decorator pattern for authentication and authorisation, and delegates to Technical Services.
Acts as the controlled entry point into the system from the outside world.

### Domain Layer — `src/lib/domain/`
The real-world concepts of the system modelled as classes with identity and behaviour:

| Entity | Responsibility |
|---|---|
| `Bike` | Represents a BIXI station. Knows if it is available. Can reserve and return itself. |
| `ParkingSpot` | Represents an off-street parking location with address and coordinates. |
| `Reservation` | An active booking. Knows its type, resource, and whether it has expired. |
| `Trip` | A planned transit journey. Can calculate the straight-line distance between points. |
| `User` | A registered user. Knows its own role, approval status, and admin permissions. |

### Technical Services Layer — `src/lib/technical-services/`
Reusable technical infrastructure that supports the rest of the system. Contains the GoF design
patterns applied in this project:

| Subfolder | Pattern | Responsibility |
|---|---|---|
| `persistence/` | Singleton | Single shared Prisma ORM client |
| `security/` | Decorator | Session resolution and auth middleware wrappers |
| `providers/` | Adapter | Normalises the external BIXI GBFS feed |
| `commands/` | Command | Encapsulates reservation execute and undo operations |
| `factories/` | Factory | Centralises order object creation |
| `services/` | Service | Pure carbon savings calculation logic |

---

## Mapping to Course Layers (Larman Fig 13.4)

| Course Layer Name | CityCircuit Layer | Location |
|---|---|---|
| UI / Presentation | UI Layer | `src/app/[pages]/`, `src/components/` |
| Application | Application Layer | `src/app/api/` |
| Domain | Domain Layer | `src/lib/domain/` |
| Technical Services | Technical Services Layer | `src/lib/technical-services/` |
| Foundation / Data | Data Layer | SQLite via Prisma + external APIs |

---

## Architecture Decision

**AD-1 — Database access is restricted to the Technical Services layer.**

The `prisma` client lives in `technical-services/persistence/prisma.ts`. Only files in
`src/app/api/` (Application layer) and `src/lib/technical-services/` may import it.
The UI layer (`src/app/[pages]/` and `src/components/`) never imports Prisma directly.
This enforces separation of concerns and makes the persistence layer independently replaceable.