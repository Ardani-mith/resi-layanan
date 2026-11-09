import { fail, route } from "@/lib/api";
import { getStats } from "@/lib/dal";
import { BOTTLENECK_MONTHS, BOTTLENECK_PERIODS, bottleneckCsv, filterBottlenecks } from "@/lib/stats";

// Data terbuka tren bottleneck bulanan (CSV) untuk evaluasi instansi, sesuai filter di /rapor:
// ?layanan=<slug> (kosong = semua) & ?bulan=3|6|12. Agregat saja, tanpa data pribadi.
export const GET = route(async (request) => {
  const params = request.nextUrl.searchParams;
  const asked = Number(params.get("bulan"));
  const months = (BOTTLENECK_PERIODS as readonly number[]).includes(asked) ? asked : BOTTLENECK_MONTHS;
  const slug = params.get("layanan") || null;

  const { bottlenecks } = await getStats();
  if (slug && !bottlenecks.services.some((s) => s.slug === slug)) {
    return fail(404, "Layanan tidak ditemukan.");
  }
  const csv = bottleneckCsv(filterBottlenecks(bottlenecks, slug, months));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bottleneck-${slug ?? "semua-layanan"}-${months}-bulan.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
