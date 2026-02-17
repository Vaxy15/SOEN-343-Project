import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  const session = match?.[1];

  if (!session) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: session },
    select: { id: true, email: true, role: true, status: true, createdAt: true },
  });

  return NextResponse.json({ user: user ?? null });
}
