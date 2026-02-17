import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Body = {
  email: string;
  password: string;
  role?: "USER" | "ADMIN";
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role ?? "USER";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const status = role === "ADMIN" ? "PENDING" : "APPROVED";

    const user = await prisma.user.create({
      data: { email, passwordHash, role, status },
      select: { id: true, email: true, role: true, status: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Register failed." }, { status: 500 });
  }
}
