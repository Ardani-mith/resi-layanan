import { ok, requireUser, route } from "@/lib/api";
import { getStats } from "@/lib/dal";

// Publik (rapor SLA): agregat saja. ?scope=internal (pimpinan/admin): + daftar eskalasi.
export const GET = route(async (request) => {
  const internal = request.nextUrl.searchParams.get("scope") === "internal";
  if (internal) {
    const { error } = await requireUser(["pimpinan", "admin"]);
    if (error) return error;
  }
  return ok(await getStats({ internal }));
});
