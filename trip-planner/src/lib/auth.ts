// src/lib/auth.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "PENDING" | "APPROVED" | "REJECTED";
};

/**
 * In this project, the "session" cookie stores the USER ID directly
 * (set in /api/auth/login). So we look up the User by id.
 *
 * Returns null if not logged in / invalid cookie.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Next 15+ can treat cookies() as async depending on runtime;
  // this works in your setup (you already changed it to await cookies()).
  const cookieStore = await cookies();
  const userId = cookieStore.get("session")?.value;

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();

  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  if (user.status !== "APPROVED") throw new Error("ADMIN_NOT_APPROVED");

  return user;
}
