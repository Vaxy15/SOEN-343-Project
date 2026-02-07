export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">SOEN-343 Trip Planner</h1>

        <p className="text-zinc-600">
          Plan multimodal trips using STM + BIXI (GBFS), and view admin analytics.
        </p>

        <div className="flex gap-3">
          <a
            href="/planner"
            className="px-4 py-2 rounded border bg-black text-white hover:opacity-90"
          >
            Open Planner
          </a>

          <a
            href="/admin"
            className="px-4 py-2 rounded border bg-white hover:bg-zinc-100"
          >
            Open Admin
          </a>
        </div>
      </div>
    </main>
  );
}
