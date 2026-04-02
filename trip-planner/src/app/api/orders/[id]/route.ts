import { NextResponse } from "next/server";
import { requireUser } from "@/lib/technical-services/security/session";
import { prisma } from "@/lib/technical-services/persistence/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.mockOrder.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        createdAt: true,
        type: true,
        priceCents: true,
        status: true,
        detailsJson: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (e: any) {
    const msg = e?.message ?? "FAILED";
    return NextResponse.json({ error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 500 });
  }
}
