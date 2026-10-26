import { ok, route } from "@/lib/api";
import { getStats } from "@/lib/dal";

// Data terbuka rapor SLA (sama dengan /rapor): agregat saja, tanpa data pribadi.
export const GET = route(async () => ok(await getStats()));
