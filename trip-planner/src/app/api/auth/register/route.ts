import { NextResponse } from "next/server";
import { prisma } from "@/lib/technical-services/persistence/prisma";
import bcrypt from "bcryptjs";

type Body = {
  name: string;
  email: string;
  password: string;
  role?: "USER" | "ADMIN";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role === "ADMIN" ? "ADMIN" : "USER";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Admin accounts must be approved before they can log in
    const status = role === "ADMIN" ? "PENDING" : "APPROVED";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Registration failed." },
      { status: 500 }
    );
  }
}
