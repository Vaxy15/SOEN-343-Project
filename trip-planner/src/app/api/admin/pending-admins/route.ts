import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getSessionUser();
  const isApprovedAdmin = user?.role === "ADMIN" && user?.status === "APPROVED";

  if (!isApprovedAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pending = await prisma.user.findMany({
    where: { role: "ADMIN", status: "PENDING" },
    select: { id: true, email: true, createdAt: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users: pending });
}