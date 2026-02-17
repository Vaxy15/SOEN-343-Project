// SOEN-343-Project\trip-planner\src\app\api\admin\metrics\routes.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [tripPlans, usersTotal, pendingAdmins] = await Promise.all([
      prisma.tripPlan.count(),
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN", status: "PENDING" } }),
    ]);

    return NextResponse.json({
      planVersion: "admin-metrics-v1-2026-02-13",
      totals: {
        tripPlans,
        usersTotal,
        pendingAdmins,
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? "FORBIDDEN";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}
