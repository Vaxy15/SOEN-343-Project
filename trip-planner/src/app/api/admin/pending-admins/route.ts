// src/app/api/admin/pending-admins/route.ts
// PATTERN: Decorator
// withAdmin wraps the handler, eliminating the manual auth check that
// previously lived inside the function body.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/withAuth";
import { SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withAdmin(async (_req: Request, _user: SessionUser) => {
  const pending = await prisma.user.findMany({
    where: { role: "ADMIN", status: "PENDING" },
    select: { id: true, email: true, createdAt: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users: pending });
});
