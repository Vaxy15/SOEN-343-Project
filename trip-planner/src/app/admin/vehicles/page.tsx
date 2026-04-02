"use client";

import { useEffect, useState } from "react";

type Vehicle = {
  id: string; name: string; type: string; provider: string | null;
  stationId: string | null; stationName: string | null;
  lat: number | null; lon: number | null;
  available: number; status: string; createdAt: string; updatedAt: string;
};
type NewVehicle = { name: string; type: string; provider: string; stationId: string; stationName: string; lat: string; lon: string; available: number; status: string };
const emptyForm: NewVehicle = { name: "", type: "BIKE", provider: "", stationId: "", stationName: "", lat: "", lon: "", available: 0, status: "ACTIVE" };

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
  MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-100",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<NewVehicle>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/vehicles?t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load vehicles.");
      setVehicles(json?.vehicles ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  }

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lat: form.lat === "" ? null : Number(form.lat), lon: form.lon === "" ? null : Number(form.lon) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create vehicle.");
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAvailability(id: string, next: number) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available: Math.max(0, next) }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed.");
      await load();
    } catch (e: any) { setErr(e?.message); } finally { setBusyId(null); }
  }

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed.");
      await load();
    } catch (e: any) { setErr(e?.message); } finally { setBusyId(null); }
  }

  async function deleteVehicle(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed.");
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (e: any) { setErr(e?.message); } finally { setBusyId(null); }
  }

  useEffect(() => { load(); }, []);

  const inputCls = "border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vehicle Management</h1>
          <p className="text-sm text-slate-500 mt-1">Add, update, and remove vehicles and bike stations</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin" className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 transition">← Dashboard</a>
          <button onClick={load} disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 transition disabled:opacity-50">
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">{err}</div>}

      {/* Add vehicle form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="text-sm font-semibold text-slate-700 mb-4">Add vehicle</div>
        <form onSubmit={createVehicle} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input className={inputCls} placeholder="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <input className={inputCls} placeholder="Type (e.g. BIKE)" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          <input className={inputCls} placeholder="Provider" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
          <input className={inputCls} placeholder="Station ID" value={form.stationId} onChange={(e) => setForm((f) => ({ ...f, stationId: e.target.value }))} />
          <input className={inputCls} placeholder="Station name" value={form.stationName} onChange={(e) => setForm((f) => ({ ...f, stationName: e.target.value }))} />
          <input className={inputCls} placeholder="Latitude" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
          <input className={inputCls} placeholder="Longitude" value={form.lon} onChange={(e) => setForm((f) => ({ ...f, lon: e.target.value }))} />
          <input className={inputCls} placeholder="Available" type="number" min={0} value={form.available} onChange={(e) => setForm((f) => ({ ...f, available: Number(e.target.value) }))} />
          <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <div className="lg:col-span-3">
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50">
              {saving ? "Adding…" : "Add vehicle"}
            </button>
          </div>
        </form>
      </div>

      {/* Vehicles table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-sm font-semibold text-slate-700">
            Current vehicles
            <span className="ml-2 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">{vehicles.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading vehicles…</div>
        ) : vehicles.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No vehicles yet. Add one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Name", "Type", "Station", "Coordinates", "Available", "Status", ""].map((h) => (
                    <th key={h} className={`py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{v.name}</div>
                      <div className="text-xs text-slate-400">{v.provider || "—"}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{v.type}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700">{v.stationName || "—"}</div>
                      <div className="text-xs text-slate-400">{v.stationId || ""}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {v.lat !== null && v.lon !== null ? `${v.lat}, ${v.lon}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button disabled={busyId === v.id} onClick={() => updateAvailability(v.id, v.available - 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 flex items-center justify-center font-bold text-xs">−</button>
                        <span className="min-w-[2rem] text-center font-semibold text-slate-800">{v.available}</span>
                        <button disabled={busyId === v.id} onClick={() => updateAvailability(v.id, v.available + 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 flex items-center justify-center font-bold text-xs">+</button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select value={v.status} disabled={busyId === v.id} onChange={(e) => updateStatus(v.id, e.target.value)}
                        className={`text-xs font-semibold border rounded-lg px-2 py-1 focus:outline-none transition ${statusStyles[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button disabled={busyId === v.id} onClick={() => deleteVehicle(v.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition disabled:opacity-50">
                        {busyId === v.id ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
