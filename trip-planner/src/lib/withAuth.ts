// src/lib/withAuth.ts
// PATTERN: Decorator
// withAuth and withAdmin are higher-order function decorators that wrap route
// handlers. Each decorator adds a behaviour (auth check, admin check) without
// modifying the handler itself. They compose — withAdmin wraps withAuth —
// exactly like classic decorator layering.

import { NextResponse } from "next/server";
import { getSessionUser, SessionUser } from "@/lib/auth";

type RouteHandler = (req: Request, user: SessionUser) => Promise<Response>;
type WrappedHandler = (req: Request) => Promise<Response>;

/**
 * Decorator: requires a logged-in user of any role.
 * Injects the resolved SessionUser into the handler so it never needs
 * to call getSessionUser() itself.
 */
export function withAuth(handler: RouteHandler): WrappedHandler {
  return async (req: Request) => {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    return handler(req, user);
  };
}

/**
 * Decorator: requires an approved admin.
 * Composes on top of withAuth — if the user isn't logged in, withAuth
 * rejects first. If they are logged in but not an approved admin, this
 * decorator rejects.
 */
export function withAdmin(handler: RouteHandler): WrappedHandler {
  return withAuth(async (req, user) => {
    if (user.role !== "ADMIN" || user.status !== "APPROVED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, user);
  });
}