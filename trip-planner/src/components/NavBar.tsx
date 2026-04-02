import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";

export default async function NavBar() {
  const user = await getSessionUser();
  const isApprovedAdmin = user?.role === "ADMIN" && user?.status === "APPROVED";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">CC</span>
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            <span className="text-blue-500">City</span><span className="text-emerald-500">Circuit</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 text-sm font-medium overflow-x-auto">
          <Link href="/planner" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition whitespace-nowrap">
            🚌 Plan
          </Link>
          <Link href="/rent" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition whitespace-nowrap">
            🚲 Bixi
          </Link>
          <Link href="/parking" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition whitespace-nowrap">
            🅿️ Parking
          </Link>
          {user && (
            <Link href="/account" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition whitespace-nowrap">
              My Account
            </Link>
          )}
          {isApprovedAdmin && (
            <>
              <Link href="/admin" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition whitespace-nowrap">
                Admin
              </Link>
              <Link href="/admin/vehicles" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition whitespace-nowrap">
                Vehicles
              </Link>
            </>
          )}
        </nav>

        <UserMenu user={user} />
      </div>
    </header>
  );
}