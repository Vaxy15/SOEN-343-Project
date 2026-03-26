// src/components/NavBar.tsx
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";

export default async function NavBar() {
  const user = await getSessionUser();

  const isApprovedAdmin =
    user?.role === "ADMIN" && user?.status === "APPROVED";

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight text-lg">
            <span className="text-[var(--brand-blue)]">City</span>
            <span className="text-[var(--brand-green)]">Circuit</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/planner"
              className="text-[var(--brand-blue)] hover:opacity-80 transition"
            >
              Plan a Trip
            </Link>

            <Link
              href="/rent"
              className="text-[var(--brand-green)] hover:opacity-80 transition"
            >
              Bixi
            </Link>

            <Link
              href="/parking"
              className="text-[var(--brand-dark)] hover:opacity-80 transition"
            >
              Parking
            </Link>

            {isApprovedAdmin && (
              <>
                <Link
                  href="/admin"
                  className="text-[var(--brand-dark)] hover:opacity-80 transition"
                >
                  Admin
                </Link>

                <Link
                  href="/admin/vehicles"
                  className="text-[var(--brand-dark)] hover:opacity-80 transition"
                >
                  Vehicles
                </Link>
              </>
            )}
          </nav>
        </div>

        <UserMenu user={user} />
      </div>
    </header>
  );
}