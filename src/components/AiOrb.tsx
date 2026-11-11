"use client";

import { useEffect, useRef, useState } from "react";

// Bagian Asisten Pantas yang dipakai di dua tempat: kartu asisten di halaman lacak
// (lacak/[resi]/Assistant.tsx) dan demo interaktif di beranda (AssistantDemo.tsx).

/** Teks muncul bertahap seperti sedang diketik; "kurangi gerakan" = langsung utuh. */
export function Typed({ text }: { text: string }) {
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

// --- Orb mutiara (Canvas) ---------------------------------------------------------------------
//
// Orb mutiara dengan tepi elastis: tepinya 40 titik berpegas (ke arus gelombang & ke tetangga)
// sehingga bentuknya bergelombang dan memantul; warna pastel di dalamnya mengalir (noda warna
// digerakkan pegas), dibungkus bayangan tepi, kilau kiri-atas, dan cahaya pantul bawah.
// Status: siap (gelombang kecil, lalu "tidur"), berpikir (gelombang besar + denyut suara + tiga
// titik cahaya mengorbit), menjawab (denyut ritmis + riak lingkaran), gagal (abu-abu, hampir diam).
// Kilau & tepi mengikuti kursor; klik = tepi penyok lalu memantul.

export type OrbMode = "idle" | "thinking" | "answering" | "error";

export const ORB_LABEL: Record<OrbMode, string> = {
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
export function OrbCanvas({ mode, size }: { mode: OrbMode; size: number }) {
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
      // Jangkauan pendar dijaga di dalam kanvas (blur terlalu lebar terpotong jadi kotak samar).
      ctx.shadowBlur = pad * 0.8;
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
