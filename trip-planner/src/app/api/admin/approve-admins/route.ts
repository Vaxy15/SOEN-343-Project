// SOEN-343-Project\trip-planner\src\app\api\admin\approve-admins
SOEN-343-Project\trip-planner\src\app\api\admin\approve-admins\routes.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = { userId: string; action?: "APPROVED" | "REJECTED" };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const userId = body.userId;
  const action = body.action ?? "APPROVED";

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: action },
    select: { id: true, email: true, role: true, status: true },
  });

  return NextResponse.json({ user: updated });
}
