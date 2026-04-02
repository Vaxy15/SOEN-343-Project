# Design Patterns — CityCircuit

CityCircuit applies five GoF (Gang of Four) design patterns within its Technical Services layer.
Each pattern is documented with its intent, location, the problem it solves, and a code summary.

---

## 1. Command Pattern

**Intent:** Encapsulate a request as an object so it can be executed, undone, and extended
independently of the caller.

**Location:** `src/lib/technical-services/commands/ReservationCommand.ts`

**Problem it solves:** The checkout route needs to make a reservation and the cancel route needs
to undo it. Without Command, both routes would contain duplicated logic and the reserve and
cancel operations would be disconnected.

**How it is applied:**
Each reservation type is a Command object implementing the `ReservationCommand` interface with
`execute()` and `undo()`. The checkout route constructs the appropriate command and calls
`execute()`. Cancellation calls `undo()` — the two operations are symmetrically paired.
```typescript
export interface ReservationCommand {
  execute(): Promise<{ ok: boolean; orderId?: string; error?: string }>;
  undo():    Promise<{ ok: boolean; error?: string }>;
}

export class BikeReservationCommand implements ReservationCommand {
  async execute() { /* reserve bike, decrement Vehicle.available, create order */ }
  async undo()    { /* delete reservation, restore Vehicle.available */ }
}

export class ParkingReservationCommand implements ReservationCommand {
  async execute() { /* create parking reservation, create order */ }
  async undo()    { /* delete reservation */ }
}

// Applied in the checkout route:
const command = new BikeReservationCommand({ userId, stationId, stationName });
const result  = await command.execute();
```

---

## 2. Factory Pattern

**Intent:** Centralise object creation so that callers do not need to know construction details.

**Location:** `src/lib/technical-services/factories/OrderFactory.ts`

**Problem it solves:** Orders are created in multiple places. Without a factory, pricing, status,
and JSON serialization logic would be duplicated and could become inconsistent.

**How it is applied:**
`OrderFactory` is a static factory with one method per order type. All order creation in the
system goes through it, guaranteeing consistent structure and pricing everywhere.
```typescript
export class OrderFactory {
  // Always $4.99 for a bike reservation
  static createBikeOrder(userId: string, details: BikeOrderDetails): OrderPayload {
    return { userId, type: "bike", priceCents: 499, status: "PAID",
             detailsJson: JSON.stringify(details) };
  }

  // Always $12.99 for a parking reservation
  static createParkingOrder(userId: string, details: ParkingOrderDetails): OrderPayload {
    return { userId, type: "parking", priceCents: 1299, status: "PAID",
             detailsJson: JSON.stringify(details) };
  }
}
```

---

## 3. Decorator Pattern

**Intent:** Attach additional behaviour to a function dynamically without modifying it.

**Location:** `src/lib/technical-services/security/middleware.ts`

**Problem it solves:** Over 10 API routes require authentication. Without a decorator, every
handler would repeat the same session-check boilerplate, mixing auth concerns with business logic.

**How it is applied:**
`withAuth` and `withAdmin` are higher-order functions that wrap route handlers. Each adds a
behaviour transparently. `withAdmin` composes on top of `withAuth` — classic decorator layering.
The handler itself receives a guaranteed `SessionUser` and contains zero auth logic.
```typescript
export function withAuth(handler: RouteHandler): WrappedHandler {
  return async (req) => {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return handler(req, user);
  };
}

export function withAdmin(handler: RouteHandler): WrappedHandler {
  return withAuth(async (req, user) => {
    if (user.role !== "ADMIN" || user.status !== "APPROVED")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return handler(req, user);
  });
}

// Applied at the route level — handler contains zero auth logic:
export const GET  = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
```

---

## 4. Adapter Pattern

**Intent:** Convert the interface of an external system into the interface the application expects.

**Location:** `src/lib/technical-services/providers/gbfs.ts`

**Problem it solves:** The BIXI GBFS feed returns inconsistent field names across station
operators. The UI cannot safely consume it directly without normalisation.

**How it is applied:**
The adapter fetches the raw GBFS feed and normalises all field name variations into a single
clean `GbfsStation` shape. The rest of the application always works with `GbfsStation` — it
never sees the raw feed format.
```typescript
// Clean internal shape the entire app depends on:
export type GbfsStation = {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  bikes_available: number;  // always a plain number — never a raw GBFS object
  docks_available: number;
};

// Adapter handles all raw GBFS field name variations:
function extractBikes(raw: any, stationId: string, capacity?: number): number {
  const direct = asNumber(raw?.num_bikes_available);
  if (typeof direct === "number") return direct;
  const typed = sumTypedBikes(raw?.num_bikes_available_types);
  if (typeof typed === "number") return typed;
  return inferAvailabilityFromCapacity(stationId, capacity).bikes; // fallback
}
```

---

## 5. Singleton Pattern

**Intent:** Ensure a class has only one instance and provide a global point of access to it.

**Location:** `src/lib/technical-services/persistence/prisma.ts`

**Problem it solves:** In Next.js development, hot-reloading creates a new module instance on
every file change. Without Singleton, a new Prisma client would be created each time, exhausting
the database connection pool.

**How it is applied:**
The Prisma client is stored on the Node.js `globalThis` object. On first call a new instance is
created and stored globally. Every subsequent call returns the same instance.
```typescript
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## Summary

| Pattern | Location | Problem Solved |
|---|---|---|
| Command | `technical-services/commands/ReservationCommand.ts` | Pair reserve + cancel, support undo |
| Factory | `technical-services/factories/OrderFactory.ts` | Consistent order creation and pricing |
| Decorator | `technical-services/security/middleware.ts` | Auth without polluting route handlers |
| Adapter | `technical-services/providers/gbfs.ts` | Normalise inconsistent GBFS feed format |
| Singleton | `technical-services/persistence/prisma.ts` | Single shared Prisma client instance |
