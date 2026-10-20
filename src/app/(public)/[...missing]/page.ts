import { notFound } from "next/navigation";

// Menangkap alamat yang tidak cocok dengan route mana pun, supaya 404-nya dirender di dalam
// layout (public) (navbar + footer) oleh (public)/not-found.tsx, bukan tanpa kerangka.
export default function Missing() {
  notFound();
}
