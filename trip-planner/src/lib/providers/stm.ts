// Phase 1: stub interfaces so your app compiles.
// Phase 2: wire GTFS / GTFS-RT once you have STM portal access details.

export type StmRealtime = unknown
  // TODO: fill later: vehicle positions, trip updates, occupancy, etc.


export async function getStmRealtime(): Promise<StmRealtime> {
  // TODO: connect to STM GTFS-realtime / API i3 from STM developer portal.
  // STM access typically requires registration and credentials.
  return {};
}
