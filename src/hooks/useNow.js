"use client";

import { useSyncExternalStore } from "react";

// Satu interval bersama untuk semua komponen hitung mundur di halaman.
// Saat render server & hidrasi, snapshot = null, sehingga komponen memakai waktu
// dari server dulu (tanpa hydration mismatch), lalu beralih ke jam browser.

const TICK_MS = 15_000;
let current = null;
let timer = null;
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => current ?? (current = Date.now());
const getServerSnapshot = () => null;

/**
 * Waktu "sekarang" sistem dalam ms. `serverNow` = waktu saat server merender,
 * `offsetMs` = geseran mode demo, supaya hitung mundur di browser ikut maju.
 */
export function useNow(serverNow, offsetMs = 0) {
  const clientNow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return clientNow === null ? new Date(serverNow).getTime() : clientNow + offsetMs;
}
