import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center py-8">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-10 space-y-6">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="CityCircuit" width={420} height={420} priority className="h-auto w-full max-w-xs" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">
              Get around <span className="text-blue-500">Montreal</span>, smarter
            </h1>
            <p className="mt-2 text-slate-500 text-base">
              Plan transit trips and reserve bikes or parking — all in one place.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/planner" className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-sm transition flex items-center justify-center gap-2">
              🚌 Plan a Trip
            </Link>
            <Link href="/rent" className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-sm transition flex items-center justify-center gap-2">
              🚲 Reserve a Bike
            </Link>
            <Link href="/parking" className="px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-sm transition flex items-center justify-center gap-2">
              🅿️ Find Parking
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: "🚌", label: "Transit routing", desc: "Real STM directions" },
            { emoji: "🚲", label: "BIXI stations", desc: "Live availability" },
            { emoji: "🅿️", label: "Off-street parking", desc: "Book instantly" },
          ].map((f) => (
            <div key={f.label} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">{f.emoji}</div>
              <div className="text-sm font-semibold text-slate-700">{f.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">Map it. Book it. Ride it.</p>
      </div>
    </div>
  );
}
