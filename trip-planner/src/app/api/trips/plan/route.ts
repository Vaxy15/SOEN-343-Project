// SOEN-343-Project\trip-planner\src\app\api\trips\plan\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PLAN_VERSION = "transit-only-v3-2026-02-13";

type Body = {
  origin: { lat: number; lon: number; label?: string };
  destination: { lat: number; lon: number; label?: string };
  mode?: "transit" | "bixi" | "transit+bixi";
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  // ✅ Force transit-only regardless of what the client sends
  const mode = "transit";

  const plan = {
    planVersion: PLAN_VERSION,
    mode,
    origin: body.origin,
    destination: body.destination,
    bixi: null, // ✅ always null now
    stm: null,
  };

  // ✅ server-side proof in your terminal
  console.log("[/api/trips/plan]", PLAN_VERSION, {
    origin: plan.origin?.label ?? plan.origin,
    destination: plan.destination?.label ?? plan.destination,
  });

  const saved = await prisma.tripPlan.create({
    data: {
      origin: body.origin.label ?? `${body.origin.lat},${body.origin.lon}`,
      destination: body.destination.label ?? `${body.destination.lat},${body.destination.lon}`,
      mode,
      resultJson: JSON.stringify(plan),
    },
  });

  return NextResponse.json(
    { tripId: saved.id, plan },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-Plan-Version": PLAN_VERSION,
      },
    }
  );
}
