import { ok, route } from "@/lib/api";
import { listActiveServices } from "@/lib/services";

// Daftar layanan aktif untuk form pengajuan & halaman /layanan.
export const GET = route(async () => ok(await listActiveServices()));
