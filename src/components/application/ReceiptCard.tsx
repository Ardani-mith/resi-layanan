"use client";

import { Download, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui";
import type { Receipt } from "@/lib/qr";

/**
 * Bukti resi: QR menuju halaman lacak + unduh gambar PNG + cetak. Saat dicetak, hanya
 * kartu ini yang tampil (kelas print-area, lihat globals.css).
 */
export default function ReceiptCard({ resi, url, qr, title = "Bukti resi" }: Receipt & { title?: string }) {
  return (
    <section
      aria-label={title}
      className="print-area @container rounded-card border border-line bg-surface p-5"
    >
      {/* Container query: tetap rapi di kolom samping yang sempit maupun selebar halaman. */}
      <div className="flex flex-col items-center gap-4 @md:flex-row @md:items-start">
        <div
          role="img"
          aria-label={`Kode QR menuju ${url}`}
          className="size-32 shrink-0 overflow-hidden rounded-xl border border-line bg-white p-1.5 [&_svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <div className="min-w-0 flex-1 text-center @md:text-left">
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 font-mono text-lg font-bold tracking-wider">{resi}</p>
          <p className="mt-1 text-sm text-muted">
            Pindai QR untuk membuka halaman lacak, atau buka <span className="break-all">{url}</span>.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 @md:justify-start print:hidden">
            <a
              href={`/lacak/${resi}/bukti`}
              download={`bukti-${resi}.png`}
              className={buttonClass("secondary")}
            >
              <Download aria-hidden className="size-4" />
              Unduh gambar
            </a>
            <button type="button" onClick={() => window.print()} className={buttonClass("ghost")}>
              <Printer aria-hidden className="size-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
