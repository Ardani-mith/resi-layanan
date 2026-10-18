import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-muted">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <Button href="/" className="mt-6">Kembali ke beranda</Button>
    </div>
  );
}
