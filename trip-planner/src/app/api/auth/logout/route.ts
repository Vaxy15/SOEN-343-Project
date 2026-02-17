// SOEN-343-Project\trip-planner\src\app\api\auth\logout\route.ts
import { NextResponse } from "next/server";

function clear(res: NextResponse) {
  res.cookies.set("session", "", { path: "/", maxAge: 0 });
  return res;
}

export async function POST() {
  return clear(NextResponse.json({ ok: true }));
}

export async function GET(req: Request) {
  return clear(NextResponse.redirect(new URL("/", req.url)));
}
