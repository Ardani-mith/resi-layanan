"use client";

import Button from "@/components/ui/Button";

export default function Error({ reset }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Terjadi gangguan</h1>
      <p className="mt-2 text-muted">Halaman ini gagal dimuat. Coba lagi sebentar.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => reset()}>Coba lagi</Button>
        <Button href="/" variant="secondary">
          Beranda
        </Button>
      </div>
    </div>
  );
}
