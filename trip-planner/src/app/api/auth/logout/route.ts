import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function clearCookie(res: NextResponse) {
  // Clear session cookie
  res.cookies.set("session", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  // Avoid any caching
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST() {
  return clearCookie(NextResponse.json({ ok: true }));
}

export async function GET(req: Request) {
  // Optional: allow GET logout then redirect home
  const url = new URL("/", req.url);
  return clearCookie(NextResponse.redirect(url));
}