// SOEN-343-Project\trip-planner\src\app\page.tsx
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center">
      <div className="w-full max-w-3xl text-center">
        <div className="rounded-2xl border bg-white shadow-sm p-8 sm:p-10">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="CityCircuit"
              width={520}
              height={520}
              priority
              className="h-auto w-full max-w-md"
            />
          </div>

          <p className="mt-6 text-zinc-600">
            Plan transit trips and reserve bikes in one place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/planner"
              className="px-6 py-3 rounded-lg bg-[var(--brand-blue)] text-white hover:opacity-90 transition font-semibold"
            >
              Plan a Trip
            </Link>

            <Link
              href="/rent"
              className="px-6 py-3 rounded-lg bg-[var(--brand-green)] text-white hover:opacity-90 transition font-semibold"
            >
              Reserve a Bike
            </Link>
          </div>
        </div>

        <p className="mt-6 text-sm text-zinc-500">
          Map it. Book it. Ride it.
        </p>
      </div>
    </div>
  );
}
