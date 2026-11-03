"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/http";

// "Kabari saya": langganan notifikasi push untuk resi ini (lib/push.ts, public/sw.js).
// Daftar resi yang diikuti disimpan di browser ini (kenyamanan per pengunjung); sumber
// kebenarannya tetap langganan di server.

const STORE = "pantas:push";

type Support = "ok" | "ios-install" | "none";

function detectSupport(): Support {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "ok";
  // iPhone/iPad: push hanya untuk web app yang sudah dipasang di layar utama (iOS 16.4+).
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios-install" : "none";
}
const subscribeNoop = () => () => {};

function followed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
}
function saveFollowed(list: string[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(list));
  } catch {
    // Penyimpanan diblokir: langganan di server tetap jalan, hanya status tombol yang tidak diingat.
  }
}

/** Kunci VAPID (base64url) → byte untuk pushManager.subscribe. */
function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

type State = "checking" | "off" | "on" | "pending" | "denied";

const TIPS = {
  ios: "Di iPhone/iPad: ketuk Bagikan → Tambah ke Layar Utama, lalu buka resi ini dari ikon Pantas untuk menyalakan notifikasi.",
  denied: "Notifikasi untuk situs ini diblokir. Izinkan di pengaturan browser, lalu muat ulang halaman.",
  failed: "Notifikasi belum bisa diaktifkan di browser ini. Coba lagi sebentar.",
};

export default function PushToggle({ resi, publicKey }: { resi: string; publicKey: string }) {
  const support = useSyncExternalStore(subscribeNoop, detectSupport, () => null);
  const [state, setState] = useState<State>("checking");
  const [tip, setTip] = useState<string | null>(null);
  const url = `/api/track/${resi}/push`;

  useEffect(() => {
    if (support !== "ok") return;
    let alive = true;
    navigator.serviceWorker.getRegistration("/").then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      if (!alive) return;
      if (Notification.permission === "denied") setState("denied");
      else setState(subscription && followed().includes(resi) ? "on" : "off");
    });
    return () => {
      alive = false;
    };
  }, [support, resi]);

  async function enable() {
    setState("pending");
    setTip(null);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "off");
      if (permission === "denied") setTip(TIPS.denied);
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(publicKey),
        }));
      const res = await postJson(url, { action: "subscribe", subscription: subscription.toJSON() });
      if (!res.ok) {
        setTip(res.error.message);
        setState("off");
        return;
      }
      saveFollowed([...new Set([...followed(), resi])]);
      setState("on");
    } catch {
      setTip(TIPS.failed);
      setState("off");
    }
  }

  async function disable() {
    setState("pending");
    setTip(null);
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    // Langganan browser dibiarkan (bisa dipakai resi lain); cukup hapus untuk resi ini di server.
    if (subscription) await postJson(url, { action: "unsubscribe", endpoint: subscription.endpoint });
    saveFollowed(followed().filter((r) => r !== resi));
    setState("off");
  }

  if (!support || support === "none") return null;

  const on = state === "on";
  const blocked = state === "denied";
  const Icon = on ? BellRing : blocked ? BellOff : Bell;
  const label =
    support === "ios-install"
      ? "Kabari saya"
      : on
        ? "Notifikasi aktif"
        : blocked
          ? "Notifikasi diblokir"
          : state === "pending"
            ? "Mengaktifkan…"
            : "Kabari saya";

  function onClick() {
    if (support === "ios-install") setTip(tip ? null : TIPS.ios);
    else if (blocked) setTip(tip ? null : TIPS.denied);
    else if (on) disable();
    else enable();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={state === "pending" || (support === "ok" && state === "checking")}
        aria-pressed={support === "ok" ? on : undefined}
        title={on ? "Matikan notifikasi untuk resi ini" : "Kabari saya lewat notifikasi saat status berubah"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border py-1.5 pr-3.5 pl-2.5 text-sm backdrop-blur transition-colors disabled:opacity-60",
          on
            ? "border-[#4ade80]/40 bg-[#4ade80]/10 text-hero-fg hover:border-[#4ade80]/70"
            : "border-hero-line bg-hero-chip text-hero-muted hover:border-hero-line-strong hover:text-hero-fg",
        )}
      >
        <Icon aria-hidden className={cn("size-4", on && "text-[#4ade80]")} />
        {label}
      </button>
      {tip && (
        <p
          role="status"
          className="absolute top-full left-0 z-20 mt-2 w-72 rounded-xl border border-hero-line bg-[#0b1530]/95 p-3 text-xs leading-relaxed text-hero-muted shadow-[0_20px_50px_-20px_rgb(0_0_0/0.7)] backdrop-blur-md sm:right-0 sm:left-auto"
        >
          {tip}
        </p>
      )}
    </div>
  );
}
