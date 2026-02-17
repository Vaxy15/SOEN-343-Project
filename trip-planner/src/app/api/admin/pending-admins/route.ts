// SOEN-343-Project\trip-planner\src\app\api\admin\pending-admins\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const pending = await prisma.user.findMany({
    where: { role: "ADMIN", status: "PENDING" },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pending);
}
