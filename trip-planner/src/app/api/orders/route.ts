import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();

    const orders = await prisma.mockOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        type: true,
        priceCents: true,
        status: true,
        detailsJson: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (e: any) {
    const msg = e?.message ?? "FAILED";
    return NextResponse.json({ error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 500 });
  }
}