import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      where: { role: "ADMIN", status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, role: true, status: true, createdAt: true },
    });

    return NextResponse.json({ users });
  } catch (e: any) {
    const msg = e?.message ?? "FORBIDDEN";
    const status = msg === "UNAUTHORIZED" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}
