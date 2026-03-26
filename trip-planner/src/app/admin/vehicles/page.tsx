"use client";

import { useEffect, useState } from "react";

type Vehicle = {
  id: string;
  name: string;
  type: string;
  provider: string | null;
  stationId: string | null;
  stationName: string | null;
  lat: number | null;
  lon: number | null;
  available: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type NewVehicle = {
  name: string;
  type: string;
  provider: string;
  stationId: string;
  stationName: string;
  lat: string;
  lon: string;
  available: number;
  status: string;
};

const emptyForm: NewVehicle = {
  name: "",
  type: "BIKE",
  provider: "",
  stationId: "",
  stationName: "",
  lat: "",
  lon: "",
  available: 0,
  status: "ACTIVE",
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
      const res = await fetch(`/api/admin/vehicles?t=${Date.now()}`, {
        cache: "no-store",
      });

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
        body: JSON.stringify({
          ...form,
          lat: form.lat === "" ? null : Number(form.lat),
          lon: form.lon === "" ? null : Number(form.lon),
        }),
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

  async function updateAvailability(id: string, nextAvailable: number) {
    setBusyId(id);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: Math.max(0, nextAvailable) }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to update availability.");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update vehicle.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to update status.");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update vehicle.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteVehicle(id: string) {
    setBusyId(id);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to delete vehicle.");

      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete vehicle.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Vehicle Management</h1>
            <div className="text-sm text-zinc-600">
              Add, update, and remove vehicles and custom bike stations.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a className="underline text-sm text-zinc-600" href="/admin">
              Admin
            </a>
            <button
              onClick={load}
              className="px-3 py-1.5 rounded border bg-white hover:bg-zinc-100 text-sm"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-700 border rounded p-3 bg-red-50">
            {err}
          </div>
        ) : null}

        <section className="rounded-xl border bg-white p-4">
          <div className="font-medium mb-3">Add vehicle</div>

          <form onSubmit={createVehicle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              className="rounded border px-3 py-2"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />

            <input
              className="rounded border px-3 py-2"
              placeholder="Type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            />

            <input
              className="rounded border px-3 py-2"
              placeholder="Provider"
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
            />

            <input
              className="rounded border px-3 py-2"
              placeholder="Station ID"
              value={form.stationId}
              onChange={(e) => setForm((f) => ({ ...f, stationId: e.target.value }))}
            />

            <input
              className="rounded border px-3 py-2"
              placeholder="Station name"
              value={form.stationName}
              onChange={(e) => setForm((f) => ({ ...f, stationName: e.target.value }))}
            />

            <input
              className="rounded border px-3 py-2"
              placeholder="Latitude"
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
            />

            <input
              className="rounded border px-3 py-2"
              placeholder="Longitude"
              value={form.lon}
              onChange={(e) => setForm((f) => ({ ...f, lon: e.target.value }))}
            />

            <input
              className="rounded border px-3 py-2"
              placeholder="Available"
              type="number"
              min={0}
              value={form.available}
              onChange={(e) =>
                setForm((f) => ({ ...f, available: Number(e.target.value) }))
              }
            />

            <select
              className="rounded border px-3 py-2"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>

            <div className="lg:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add vehicle"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <div className="font-medium mb-3">Current vehicles</div>

          {loading ? (
            <div className="text-sm text-zinc-600">Loading vehicles…</div>
          ) : vehicles.length === 0 ? (
            <div className="text-sm text-zinc-600">No vehicles yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-zinc-600">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Station</th>
                    <th className="py-2 pr-3">Coordinates</th>
                    <th className="py-2 pr-3">Available</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-0 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{v.name}</div>
                        <div className="text-xs text-zinc-500">{v.provider || "—"}</div>
                      </td>

                      <td className="py-2 pr-3">{v.type}</td>

                      <td className="py-2 pr-3">
                        <div>{v.stationName || "—"}</div>
                        <div className="text-xs text-zinc-500">{v.stationId || ""}</div>
                      </td>

                      <td className="py-2 pr-3">
                        {v.lat !== null && v.lon !== null ? `${v.lat}, ${v.lon}` : "—"}
                      </td>

                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="px-2 py-1 rounded border"
                            disabled={busyId === v.id}
                            onClick={() => updateAvailability(v.id, v.available - 1)}
                          >
                            -
                          </button>
                          <span className="min-w-[2rem] text-center">{v.available}</span>
                          <button
                            type="button"
                            className="px-2 py-1 rounded border"
                            disabled={busyId === v.id}
                            onClick={() => updateAvailability(v.id, v.available + 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-2 pr-3">
                        <select
                          className="rounded border px-2 py-1"
                          value={v.status}
                          disabled={busyId === v.id}
                          onChange={(e) => updateStatus(v.id, e.target.value)}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </td>

                      <td className="py-2 pr-0 text-right">
                        <button
                          type="button"
                          onClick={() => deleteVehicle(v.id)}
                          disabled={busyId === v.id}
                          className="px-3 py-1.5 rounded border text-red-700 border-red-300 bg-white disabled:opacity-50"
                        >
                          {busyId === v.id ? "Working..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}