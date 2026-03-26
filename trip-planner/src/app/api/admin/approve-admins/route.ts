// src/app/api/admin/approve-admins/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/withAuth";
import { SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  userId: string;
  action?: "APPROVED" | "REJECTED";
};

async function handler(req: Request, _user: SessionUser): Promise<Response> {
  try {
    const body = (await req.json()) as Body;
    const userId = String(body.userId ?? "").trim();
    const action = body.action ?? "APPROVED";

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role !== "ADMIN") {
      return NextResponse.json({ error: "Target user is not an admin" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: action },
      select: { id: true, email: true, role: true, status: true },
    });

    return NextResponse.json({ user: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to update admin status." },
      { status: 500 }
    );
  }
}

export const POST = withAdmin(handler);