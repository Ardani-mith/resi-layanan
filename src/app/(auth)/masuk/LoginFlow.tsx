"use client";

import { Check, Cog, FileCheck2, FileText, Inbox, PackageCheck, Stamp } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Tahap berkas dari pengajuan sampai siap diambil (contoh layanan Akta Kelahiran). */
const FLOW = [
  {
    icon: Inbox,
    step: "Berkas masuk",
    role: "Warga",
    sla: "resi langsung terbit",
    text: "Warga mengajukan online atau di loket; nomor resi terbit dan tahap pertama dimulai.",
  },
  {
    icon: FileCheck2,
    step: "Verifikasi",
    role: "Petugas Loket",
    sla: "± 8 jam kerja",
    text: "Berkas dicocokkan dengan data SIAK. Kurang lengkap? Minta perbaikan, tenggat dijeda.",
  },
  {
    icon: Cog,
    step: "Proses",
    role: "Petugas Teknis",
    sla: "± 2 jam kerja",
    text: "Entri & validasi data. Lewat tenggat, berkas otomatis naik ke Kepala Seksi.",
  },
  {
    icon: Stamp,
    step: "Persetujuan",
    role: "Pimpinan",
    sla: "± 1 jam kerja",
    text: "Diperiksa dan ditandatangani elektronik (TTE), lalu dicetak.",
  },
  {
    icon: PackageCheck,
    step: "Siap diambil",
    role: "Petugas Loket",
    sla: "warga dikabari",
    text: "Warga menerima notifikasi dan mengambil dokumen dengan menunjukkan resi.",
  },
];
const STEP_MS = 1800; // lama dokumen berjalan dari satu tahap ke tahap berikutnya
const HOLD_MS = 1400; // tahan sebentar di tahap terakhir sebelum mengulang
const LAST = FLOW.length - 1;
// Garis melintang dari pusat kolom pertama (10%) ke pusat kolom terakhir (90%).
const at = (i: number) => 10 + (i / LAST) * 80;

/**
 * Diagram alur di panel login (tanpa interaksi): dokumen berjalan mulus tanpa berhenti (posisi dari
 * requestAnimationFrame, bukan lompatan per tahap); tahap muncul satu per satu saat dokumen tiba,
 * garis progres terisi di belakang ikon, tahap yang lewat dicentang, keterangan tahap aktif berganti
 * di bawahnya, lalu mengulang. Bila "kurangi gerakan": semua tahap tampil diam.
 */
export default function LoginFlow() {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Posisi dokumen & ujung garis (persen lebar) ditulis langsung ke CSS variable tiap frame,
  // tanpa render ulang; state `active` hanya berubah saat dokumen tiba di tahap baru.
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced) return;
    const cycle = LAST * STEP_MS + HOLD_MS;
    const start = performance.now();
    let reached = -1;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(((now - start) % cycle) / STEP_MS, LAST); // 0…LAST, linear
      track.current?.style.setProperty("--flow", `${at(progress)}%`);
      const step = Math.floor(progress);
      if (step !== reached) {
        reached = step;
        setActive(step);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const shown = reduced ? LAST : active; // tahap terakhir yang sudah muncul
  const current = FLOW[reduced ? 0 : active];

  return (
    <figure>
      {/* <figcaption className="text-xs font-medium tracking-wider text-center text-white/60 uppercase">
        Alur berkas
      </figcaption> */}

      <div ref={track} className="relative mt-10" style={{ "--flow": `${at(shown)}%` } as CSSProperties}>
        {/* Garis progres & dokumen berjalan; di bawah ikon (ikon berlatar pekat menutupinya). */}
        <span
          aria-hidden
          className="absolute top-5.5 left-[10%] h-0.5 w-[calc(var(--flow)_-_10%)] rounded-full bg-linear-to-r from-[#8fb0ff] to-white"
        />
        {!reduced && (
          <span aria-hidden className="absolute top-5.5 left-(--flow) z-20">
            <span className="absolute -top-9 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-md bg-white text-[#0c1f5c] shadow-[0_6px_16px_-4px_rgb(143_176_255/0.9)] motion-safe:animate-[float_2.4s_ease-in-out_infinite]">
              <FileText className="size-3.5" />
            </span>
          </span>
        )}

        <ol className="relative z-10 grid grid-cols-5">
          {FLOW.map(({ icon: Icon, step, role }, i) => {
            const visible = i <= shown;
            const done = !reduced && i < active;
            const isActive = !reduced && i === active;
            return (
              <li
                key={step}
                aria-hidden={!visible}
                className={cn(
                  "flex flex-col items-center text-center transition duration-500 ease-out",
                  visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-75 opacity-0",
                )}
              >
                {/* Latar pekat (bukan transparan) agar garis progres tidak tembus ke depan ikon. */}
                <span
                  className={cn(
                    "relative grid size-11 place-items-center rounded-xl border transition duration-500",
                    isActive
                      ? "scale-110 border-white bg-white text-[#0c1f5c] shadow-[0_0_0_6px_rgb(143_176_255/0.25)]"
                      : done
                        ? "border-[#8fb0ff]/60 bg-[#2c4396] text-white"
                        : "border-white/20 bg-[#16255f] text-white/80",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {done && (
                    <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-[#4cc79a] text-[#04140d] motion-safe:animate-[select-in_.25s_ease-out]">
                      <Check aria-hidden className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-2 text-xs leading-tight font-medium transition-colors",
                    isActive ? "text-white" : "text-white/70",
                  )}
                >
                  {step}
                </span>
                <span className="text-xs text-white/50">{role.replace("Petugas ", "")}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Keterangan tahap aktif, tanpa kartu; diumumkan sopan ke pembaca layar. */}
      <div aria-live="polite" className="mt-10 min-h-16 text-center">
        <div key={active} className="text-center motion-safe:animate-[fade-up_.4s_ease-out]">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold">{current.step}</span>
            {/* <span className="text-white/60">· {current.role}</span> */}
            {/* <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-xs text-white/80">
              {current.sla}
            </span> */}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/65">{current.text}</p>
        </div>
      </div>
    </figure>
  );
}
