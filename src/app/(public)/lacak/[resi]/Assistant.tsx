"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { AssistantAnswer } from "@/lib/assist";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/http";
import type { QuestionId } from "@/lib/validators";

type Question = { id: QuestionId; label: string };
/** null = sedang dimuat; `{ error }` = gagal (pesan singkat di kartu). */
type Slot = AssistantAnswer | { error: string } | null;

/** Teks muncul bertahap seperti sedang diketik; "kurangi gerakan" = langsung utuh. */
function Typed({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setInterval(() => {
      setShown((n) => {
        const next = instant ? text.length : Math.min(text.length, n + 2);
        if (next >= text.length) clearInterval(timer);
        return next;
      });
    }, 14);
    return () => clearInterval(timer);
  }, [text]);
  const typing = shown < text.length;
  return (
    <>
      {/* Pembaca layar mendapat teks utuh sekali, bukan per huruf. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, shown)}
        {typing && (
          <span className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-[0.2em] bg-hero-accent motion-safe:animate-pulse" />
        )}
      </span>
    </>
  );
}

/** Kerangka teks di atas latar gelap (saat ringkasan/jawaban dimuat). */
function Lines({ count }: { count: number }) {
  return (
    <span className="block space-y-2 py-1">
      <span className="sr-only">Asisten sedang menyusun jawaban.</span>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "block h-3.5 rounded-full bg-white/10 motion-safe:animate-pulse",
            i === count - 1 ? "w-2/3" : "w-full",
          )}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

/** Isi kotak jawaban: kerangka saat dimuat, pesan saat gagal, atau teks yang "diketik". */
function SlotText({ slot, lines, id }: { slot: Slot | undefined; lines: number; id: string }) {
  if (!slot) return <Lines count={lines} />;
  if ("error" in slot) return <span className="text-hero-muted">{slot.error}</span>;
  return <Typed key={id} text={slot.text} />;
}

// --- Orb mutiara (Canvas) ---------------------------------------------------------------------
//
// Orb mutiara dengan tepi elastis: tepinya 40 titik berpegas (ke arus gelombang & ke tetangga)
// sehingga bentuknya bergelombang dan memantul; warna pastel di dalamnya mengalir (noda warna
// digerakkan pegas), dibungkus bayangan tepi, kilau kiri-atas, dan cahaya pantul bawah.
// Status: siap (gelombang kecil, lalu "tidur"), berpikir (gelombang besar + denyut suara + tiga
// titik cahaya mengorbit), menjawab (denyut ritmis + riak lingkaran), gagal (abu-abu, hampir diam).
// Kilau & tepi mengikuti kursor; klik = tepi penyok lalu memantul.

type OrbMode = "idle" | "thinking" | "answering" | "error";

const ORB_LABEL: Record<OrbMode, string> = {
  idle: "Siap",
  thinking: "Menyusun jawaban",
  answering: "Menjawab",
  error: "Belum tersambung",
};

/** Noda warna di dalam bola (palet Pantas versi pastel). */
const ORB_TINTS = ["#93b4ff", "#c4b5fd", "#7ee7d8", "#f5c2f0", "#a5c8ff"];
const ORB_ERROR_TINTS = ["#b8bfcc", "#cfd3db", "#a9b0bd", "#c4c8d0", "#bcc2cc"];
/** Tepi elastis: jumlah titik & konstanta pegas (ke arus, ke tetangga, redaman). */
const EDGE_POINTS = 40;
const EDGE_SPRING = 60;
const EDGE_COUPLING = 120;
const EDGE_DAMPING = 5.5;
/** Detik tanpa aktivitas sampai orb "tidur" (aliran melambat). */
const ORB_SLEEP_AFTER = 5;

/** Arah aliran warna berubah pelan: dua sinus berbeda frekuensi per noda. */
function drift(i: number, t: number) {
  return [
    0.42 * Math.sin(t * (0.37 + i * 0.11) + i * 1.9) + 0.12 * Math.sin(t * 1.3 + i),
    0.42 * Math.cos(t * (0.29 + i * 0.07) + i * 2.6) + 0.12 * Math.cos(t * 1.1 + i * 2),
  ] as const;
}

/**
 * Kanvas orb mutiara berdiameter `size` px (ditambah ruang pendar). Ukuran kecil (avatar)
 * melewatkan titik & riak agar tetap bersih.
 */
function OrbCanvas({ mode, size }: { mode: OrbMode; size: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  // Ruang di sekitar bola untuk pendar & tepi yang menggembung (dikompensasi margin negatif).
  const pad = Math.round(size * 0.28);
  const box = size + pad * 2;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = box * dpr;
    el.height = box * dpr;
    ctx.scale(dpr, dpr);

    const c = box / 2;
    const R = size / 2;
    const mini = size < 48;
    // Fisika noda warna (koordinat relatif terhadap jari-jari) & pegas skala/kilau.
    const blobs = ORB_TINTS.map((_, i) => ({ x: drift(i, 0)[0], y: drift(i, 0)[1], vx: 0, vy: 0 }));
    const spring = { s: 1, v: 0 };
    const light = { x: -0.38, y: -0.42 };
    const pointer = { x: 0, y: 0, inside: false };
    const level = { thinking: 0, answering: 0, error: 0 };
    // Tepi elastis: simpangan radial `r` & kecepatan `v` per titik (pegas ke arus + tetangga).
    const edge = { r: new Float32Array(EDGE_POINTS), v: new Float32Array(EDGE_POINTS) };
    let nextPulse = 0;
    let nextBeat = 0;
    let time = 0;
    let calm = 0;
    let last = performance.now();
    let frame = 0;
    let visible = true;

    const ease = (from: number, to: number, dt: number, rate: number) =>
      from + (to - from) * (1 - Math.exp(-dt * rate));

    /** Hentakan pada tepi di sekitar sudut `angle` (positif = menggembung keluar). */
    const kick = (angle: number, strength: number, spread = 0.5) => {
      for (let i = 0; i < EDGE_POINTS; i++) {
        const a = (i / EDGE_POINTS) * Math.PI * 2;
        const d = Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
        edge.v[i] += strength * Math.exp(-(d * d) / spread);
      }
    };

    /** Lintasan tepi orb yang mulus (kurva kuadrat lewat titik tengah antar-titik). */
    const outline = (radius: number) => {
      const point = (i: number) => {
        const j = (i + EDGE_POINTS) % EDGE_POINTS;
        const a = (j / EDGE_POINTS) * Math.PI * 2;
        const rr = radius + edge.r[j] * (radius / R);
        return [c + Math.cos(a) * rr, c + Math.sin(a) * rr] as const;
      };
      ctx.beginPath();
      const [x0, y0] = point(-1);
      const [x1, y1] = point(0);
      ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
      for (let i = 0; i < EDGE_POINTS; i++) {
        const [px, py] = point(i);
        const [nx, ny] = point(i + 1);
        ctx.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
      }
      ctx.closePath();
    };

    const step = (dt: number) => {
      const m = modeRef.current;
      level.thinking = ease(level.thinking, m === "thinking" ? 1 : 0, dt, 4);
      level.answering = ease(level.answering, m === "answering" ? 1 : 0, dt, 4);
      level.error = ease(level.error, m === "error" ? 1 : 0, dt, 3);
      calm = m === "idle" && !pointer.inside ? calm + dt : 0;
      const sleep = Math.min(1, calm / ORB_SLEEP_AFTER);
      const energy = Math.max(level.thinking, level.answering);
      time += dt * (0.55 - 0.35 * sleep + 1.6 * energy);
      for (const [i, b] of blobs.entries()) {
        const [tx, ty] = drift(i, time);
        // Pegas teredam ke arus: gerak warna mengalir, tidak tersentak.
        b.vx += (18 * (tx - b.x) - 4.2 * b.vx) * dt;
        b.vy += (18 * (ty - b.y) - 4.2 * b.vy) * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      // Kilau mengikuti kursor (bila di dekatnya), kembali ke kiri-atas saat ditinggal.
      const lx = pointer.inside ? -0.38 + ((pointer.x - c) / R) * 0.18 : -0.38;
      const ly = pointer.inside ? -0.42 + ((pointer.y - c) / R) * 0.18 : -0.42;
      light.x = ease(light.x, lx, dt, 6);
      light.y = ease(light.y, ly, dt, 6);
      // Pegas skala: bernapas halus + membesar sedikit saat disentuh.
      const target = 1 + (pointer.inside ? 0.035 : 0) + 0.012 * Math.sin(time * 1.6) * (1 - sleep);
      spring.v += (140 * (target - spring.s) - 9 * spring.v) * dt;
      spring.s += spring.v * dt;

      // Tepi elastis. Siap: gelombang kecil yang makin tenang; berpikir: gelombang besar + denyut
      // suara acak; menjawab: denyut ritmis keluar-masuk seperti berbicara; gagal: hampir diam.
      const amp =
        R *
        ((0.05 - 0.035 * sleep) * (1 - level.error * 0.8) + 0.08 * level.thinking + 0.04 * level.answering);
      if (level.thinking > 0.3 && time > nextPulse) {
        kick(Math.random() * Math.PI * 2, R * (1.6 + Math.random() * 2.4) * level.thinking, 0.3);
        nextPulse = time + 0.25 + Math.random() * 0.35;
      }
      if (level.answering > 0.3 && time > nextBeat) {
        for (let i = 0; i < EDGE_POINTS; i++) edge.v[i] += R * 0.9 * level.answering;
        nextBeat = time + 0.55;
      }
      const near = pointer.inside ? Math.hypot(pointer.x - c, pointer.y - c) : Infinity;
      const toward = Math.atan2(pointer.y - c, pointer.x - c);
      const pull = Math.max(0, Math.min(1, (R * 1.9 - near) / (R * 1.2)));
      const { r, v } = edge;
      for (let i = 0; i < EDGE_POINTS; i++) {
        const a = (i / EDGE_POINTS) * Math.PI * 2;
        let goal = amp * (Math.sin(3 * a + 1.3 * time) + 0.6 * Math.sin(5 * a - 0.9 * time + 1.7));
        if (pull > 0) {
          // Menggembung ke arah kursor.
          const d = Math.atan2(Math.sin(a - toward), Math.cos(a - toward));
          goal += pull * R * 0.16 * Math.exp(-(d * d) / 0.35);
        }
        const lap = r[(i - 1 + EDGE_POINTS) % EDGE_POINTS] + r[(i + 1) % EDGE_POINTS] - 2 * r[i];
        v[i] += (EDGE_SPRING * (goal - r[i]) + EDGE_COUPLING * lap - EDGE_DAMPING * v[i]) * dt;
      }
      for (let i = 0; i < EDGE_POINTS; i++) r[i] += v[i] * dt;
    };

    const draw = () => {
      ctx.clearRect(0, 0, box, box);
      const r = R * spring.s;
      const tints = level.error > 0.5 ? ORB_ERROR_TINTS : ORB_TINTS;

      // Pendar luar lembut.
      ctx.save();
      ctx.shadowColor = `rgba(150, 140, 255, ${0.35 + 0.3 * Math.max(level.thinking, level.answering)})`;
      ctx.shadowBlur = pad * 1.4;
      outline(r);
      ctx.fillStyle = "#c7d2fe";
      ctx.fill();
      ctx.restore();

      ctx.save();
      outline(r);
      ctx.clip();

      // Dasar mutiara.
      const base = ctx.createRadialGradient(c, c - r * 0.2, r * 0.1, c, c, r);
      base.addColorStop(0, level.error > 0.5 ? "#e5e7eb" : "#eef2ff");
      base.addColorStop(1, level.error > 0.5 ? "#9ca3af" : "#a5b4fc");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, box, box);

      // Noda warna yang mengalir.
      for (const [i, b] of blobs.entries()) {
        const bx = c + b.x * r;
        const by = c + b.y * r;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, r * 0.85);
        g.addColorStop(0, `${tints[i]}e6`);
        g.addColorStop(1, `${tints[i]}00`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, box, box);
      }

      if (!mini) {
        // Berpikir: tiga titik cahaya mengorbit.
        if (level.thinking > 0.02) {
          ctx.save();
          ctx.shadowColor = "rgba(255,255,255,0.95)";
          ctx.shadowBlur = r * 0.18;
          ctx.fillStyle = `rgba(255,255,255,${0.95 * level.thinking})`;
          for (let k = 0; k < 3; k++) {
            const a = time * 2.4 + (k * Math.PI * 2) / 3;
            const orbit = r * (0.3 + 0.06 * Math.sin(time * 3 + k));
            ctx.beginPath();
            ctx.arc(c + Math.cos(a) * orbit, c + Math.sin(a) * orbit * 0.8, r * 0.075, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        // Menjawab: riak lingkaran konsentris dari tengah.
        if (level.answering > 0.02) {
          ctx.save();
          ctx.lineWidth = Math.max(1, r * 0.035);
          for (let k = 0; k < 3; k++) {
            const p = (time * 0.45 + k / 3) % 1;
            ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - p) * level.answering})`;
            ctx.beginPath();
            ctx.arc(c, c, r * (0.12 + p * 0.85), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Bayangan tepi (kedalaman mutiara) & cahaya pantul di bawah.
      const rim = ctx.createRadialGradient(c, c, r * 0.55, c, c, r);
      rim.addColorStop(0, "rgba(20,30,80,0)");
      rim.addColorStop(1, "rgba(20,30,80,0.32)");
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, box, box);
      const bounce = ctx.createRadialGradient(c, c + r * 0.85, 0, c, c + r * 0.85, r * 0.8);
      bounce.addColorStop(0, "rgba(255,255,255,0.35)");
      bounce.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bounce;
      ctx.fillRect(0, 0, box, box);

      // Kilau utama (mengikuti kursor) + titik terang kecil.
      const hx = c + light.x * r;
      const hy = c + light.y * r;
      const shine = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.62);
      shine.addColorStop(0, "rgba(255,255,255,0.95)");
      shine.addColorStop(0.25, "rgba(255,255,255,0.45)");
      shine.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, box, box);
      ctx.restore();

      // Garis tepi tipis.
      outline(r - 0.5);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    // "Kurangi gerakan": satu gambar diam.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw();
      return;
    }

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (visible && !document.hidden) {
        step(dt);
        draw();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(el);

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * box;
      pointer.y = ((e.clientY - rect.top) / rect.height) * box;
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    const onDown = () => {
      // Tekan → tepi di sisi kursor penyok lalu memantul, bola sedikit mengecil.
      kick(Math.atan2(pointer.y - c, pointer.x - c), -R * 9, 0.6);
      spring.v -= 1.2;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
    };
  }, [box, pad, size]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="block cursor-pointer touch-none"
      style={{ width: box, height: box, margin: -pad }}
    />
  );
}

const THINKING = ["Membaca data resi", "Mencocokkan tenggat", "Menyusun jawaban"];

/**
 * Status orb dari keadaan asisten: berpikir saat AI bekerja; menjawab sebentar setelah jawaban
 * tiba; gagal bila ringkasan tidak termuat; selain itu diam. Juga teks status berpikir yang berganti.
 */
function useOrbMode(busy: boolean, failed: boolean) {
  const [answering, setAnswering] = useState(false);
  const [step, setStep] = useState(0);
  // Pergantian sibuk → selesai disesuaikan saat render (bukan di effect) agar tanpa render berantai.
  const [seen, setSeen] = useState(busy);
  if (seen !== busy) {
    setSeen(busy);
    setAnswering(!busy);
    if (busy) setStep(0);
  }
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setStep((n) => (n + 1) % THINKING.length), 1400);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    if (!answering) return;
    const timer = setTimeout(() => setAnswering(false), 2400);
    return () => clearTimeout(timer);
  }, [answering]);
  const mode: OrbMode = busy ? "thinking" : answering ? "answering" : failed ? "error" : "idle";
  return { mode, label: mode === "thinking" ? THINKING[step] : ORB_LABEL[mode] };
}

/** Orb utama di kolom kanan kartu (layar lebar) + label status di bawahnya, seperti referensi "Aura". */
function AiOrb({ mode, label }: { mode: OrbMode; label: string }) {
  return (
    <div aria-hidden className="flex w-56 flex-col items-center gap-4">
      <OrbCanvas mode={mode} size={180} />
      <span className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-hero-muted">
        <span key={label} className="motion-safe:animate-fade-up">
          {label}
        </span>
        {mode === "thinking" && (
          <span className="flex gap-0.5">
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="size-1 rounded-full bg-hero-accent motion-safe:animate-dot-bounce"
                style={{ animationDelay: `${d * 150}ms` }}
              />
            ))}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Asisten Pantas di kepala halaman lacak: ringkasan status yang dituturkan AI, pertanyaan
 * template (sesuai status), dan kolom tanya bebas (maks. `limit` per resi per hari, hanya bila
 * AI aktif). Semua jawaban bersumber dari data resi ini (lib/assist.ts); tanpa AI, jawaban
 * dasarnya tetap tampil. Dipasang dengan `key` status, jadi berganti status = mulai ulang.
 */
export default function Assistant({
  resi,
  questions,
  canAsk,
  limit,
}: {
  resi: string;
  questions: Question[];
  /** Tanya bebas tersedia (API key AI diisi). */
  canAsk: boolean;
  /** Batas tanya bebas per hari. */
  limit: number;
}) {
  const url = `/api/track/${resi}/assistant`;
  const [summary, setSummary] = useState<Slot>(null);
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, Slot>>>({});
  const [custom, setCustom] = useState<{ question: string; slot: Slot } | null>(null);
  const [active, setActive] = useState<QuestionId | "custom" | null>(null);
  const [draft, setDraft] = useState("");
  /** Sisa jatah tanya bebas hari ini; null = belum diketahui (belum bertanya). */
  const [remaining, setRemaining] = useState<number | null>(null);

  // Satu request ringkasan per pemasangan; dibatalkan bila komponen dilepas lebih dulu
  // (mis. efek ganda React Strict Mode saat dev, atau pindah halaman).
  useEffect(() => {
    const controller = new AbortController();
    postJson<AssistantAnswer>(url, { question: null }, controller.signal).then((res) => {
      if (!controller.signal.aborted)
        setSummary(res.ok ? res.data : { error: "Ringkasan belum bisa dimuat." });
    });
    return () => controller.abort();
  }, [url]);

  async function ask(id: QuestionId) {
    setActive(id);
    if (answers[id] && !("error" in answers[id])) return;
    setAnswers((a) => ({ ...a, [id]: null }));
    const res = await postJson<AssistantAnswer>(url, { question: id });
    setAnswers((a) => ({ ...a, [id]: res.ok ? res.data : { error: res.error.message } }));
  }

  const asking = active === "custom" && custom?.slot === null;

  async function askFree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || asking) return;
    setActive("custom");
    setCustom({ question, slot: null });
    const res = await postJson<AssistantAnswer & { remaining: number }>(url, { ask: question });
    if (res.ok) {
      setCustom({ question, slot: res.data });
      setRemaining(res.data.remaining);
      setDraft("");
    } else {
      setCustom({ question, slot: { error: res.error.fields.ask ?? res.error.message } });
      if (res.status === 429) setRemaining(0);
    }
  }

  const slots = [summary, custom?.slot, ...Object.values(answers)];
  const usedAi = slots.some((s) => s && "source" in s && s.source === "ai");
  const activeLabel = active === "custom" ? custom?.question : questions.find((q) => q.id === active)?.label;
  const activeSlot = active === "custom" ? custom?.slot : active ? answers[active] : undefined;
  const exhausted = remaining === 0;
  /** AI sedang bekerja (ringkasan atau jawaban yang sedang dibuka belum tiba). */
  const busy = summary === null || (active !== null && activeSlot === null);
  const orb = useOrbMode(busy, summary !== null && "error" in summary);

  return (
    <section
      aria-labelledby="assistant-title"
      className="relative mt-8 overflow-hidden rounded-2xl border border-hero-line bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_60px_-30px_rgb(0_0_0/0.6)] backdrop-blur-md sm:p-6"
    >
      {/* Aksen "AI": garis gradien di tepi atas + pendar ungu di sudut. */}
      <div
        aria-hidden
        className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-[#b4a3ff] to-transparent"
      />
      <div aria-hidden className="absolute -top-24 -right-16 size-64 rounded-full bg-[#8b7bff]/20 blur-3xl" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="assistant-title" className="flex items-center gap-2.5 text-sm font-semibold">
            <OrbCanvas mode={orb.mode} size={28} />
            Asisten Pantas
            <span className="inline-flex items-center gap-1 rounded-md bg-[#8b7bff]/20 px-1.5 py-0.5 text-xs font-medium text-[#c4b5fd]">
              <Sparkles aria-hidden className="size-3" />
              AI
            </span>
          </h2>
          {summary !== null && (
            <span className="text-xs text-hero-muted">
              {usedAi
                ? "Dibantu AI · acuan resmi tetap data di halaman ini"
                : "Jawaban otomatis dari data resi ini"}
            </span>
          )}
        </div>

        {/* Layar lebar: ringkasan, pertanyaan & kolom tanya di kiri; orb besar di kanan, sejajar
            dengan seluruh blok itu (sampai kolom tanya). Kotak jawaban selebar kartu di bawahnya. */}
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-12">
          <div className="min-w-0">
            <p
              aria-live="polite"
              className="mt-3 max-w-6xl text-base leading-relaxed text-hero-fg sm:text-lg"
            >
              <SlotText slot={summary} lines={2} id="summary" />
            </p>

            {questions.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-hero-muted">Tanya asisten</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {questions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      aria-pressed={active === q.id}
                      aria-controls="assistant-answer"
                      onClick={() => ask(q.id)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                        active === q.id
                          ? "border-white bg-white font-medium text-[#0c1f5c]"
                          : "border-hero-line bg-hero-chip text-hero-muted hover:border-hero-line-strong hover:text-hero-fg",
                      )}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canAsk && (
              <form method="post" onSubmit={askFree} className="mt-4 max-w-2xl">
                <label htmlFor="assistant-ask" className="sr-only">
                  Tanya hal lain tentang permohonan ini
                </label>
                <div className="flex items-center gap-2 rounded-full border border-hero-line bg-black/20 py-1.5 pr-1.5 pl-4 transition-colors focus-within:border-hero-line-strong focus-within:ring-4 focus-within:ring-white/10">
                  <input
                    id="assistant-ask"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={160}
                    autoComplete="off"
                    disabled={exhausted}
                    placeholder={
                      exhausted
                        ? "Jatah pertanyaan hari ini sudah habis"
                        : "Tanya hal lain tentang permohonan ini…"
                    }
                    aria-describedby="assistant-ask-hint"
                    className="min-w-0 flex-1 bg-transparent text-sm text-hero-fg outline-none placeholder:text-hero-muted/70 disabled:cursor-not-allowed sm:text-base"
                  />
                  <button
                    type="submit"
                    aria-label="Kirim pertanyaan"
                    disabled={exhausted || asking || draft.trim().length < 5}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#7c9cff] to-[#b07cff] text-white shadow-[0_6px_18px_-6px_#8b7bff] transition-opacity disabled:opacity-40"
                  >
                    <ArrowUp aria-hidden className={cn("size-4", asking && "motion-safe:animate-bounce")} />
                  </button>
                </div>
                <p id="assistant-ask-hint" className="mt-2 px-4 text-xs text-hero-muted">
                  {remaining === null
                    ? `Maks. ${limit} pertanyaan per hari`
                    : `Sisa ${remaining} dari ${limit} pertanyaan hari ini`}{" "}
                  · jangan tulis NIK atau nomor HP
                </p>
              </form>
            )}
          </div>
          <div className="hidden xl:flex xl:justify-center">
            <AiOrb mode={orb.mode} label={orb.label} />
          </div>
        </div>

        {active && (
          <div
            id="assistant-answer"
            aria-live="polite"
            className="mt-4 rounded-xl border border-hero-line bg-black/20 px-4 py-3.5 text-sm leading-relaxed sm:text-base"
          >
            <p className="mb-1.5 text-xs text-hero-muted">“{activeLabel}”</p>
            <SlotText
              slot={activeSlot}
              lines={3}
              id={active === "custom" ? `custom-${custom?.question}` : active}
            />
          </div>
        )}
      </div>
    </section>
  );
}
