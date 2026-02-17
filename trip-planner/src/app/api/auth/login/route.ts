// SOEN-343-Project\trip-planner\src\app\api\auth\login\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Body = { email: string; password: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // Block admin login until approved (and block rejected)
    if (user.role === "ADMIN" && user.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Admin account is ${user.status}.` },
        { status: 403 }
      );
    }
    if (user.status === "REJECTED") {
      return NextResponse.json({ error: "Account rejected." }, { status: 403 });
    }

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role, status: user.status },
    });

    // Minimal session cookie (project-grade). For production you'd use signed/encrypted tokens.
    res.cookies.set("session", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // secure: true, // enable on https
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Login failed." }, { status: 500 });
  }
}
