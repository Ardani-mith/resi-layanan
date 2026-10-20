import { NotFoundView } from "@/components/ui";
export default function NotFound() {
  return (
    <NotFoundView
      title="Data tidak ditemukan"
      body="Permohonan atau halaman ini tidak ada. Periksa kembali nomor resinya."
      href="/kerja"
      action="Kembali ke antrean"
    />
  );
}
