// src/app/admin/page.tsx
import { requireAdmin } from "@/lib/auth";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  // ✅ runs on the server, can read cookies
  await requireAdmin();

  // ✅ now render the client UI that can fetch data
  return <AdminClient />;
}
