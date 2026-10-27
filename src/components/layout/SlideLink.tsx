"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Urutan bagian situs warga, kiri → kanan; menentukan arah geser halaman (PageSlide). */
const ORDER = ["", "lacak", "layanan", "rapor", "ajukan"];

const rank = (path: string) => ORDER.indexOf(path.split("/")[1] ?? "");

/** Maju di urutan = geser ke kiri; mundur, atau naik dari halaman detail ke induknya = ke kanan. */
export function slideDirection(from: string, to: string): "nav-forward" | "nav-back" | undefined {
  const [a, b] = [rank(from), rank(to)];
  if (a < 0 || b < 0 || from === to) return undefined;
  if (a !== b) return b > a ? "nav-forward" : "nav-back";
  return to.length < from.length ? "nav-back" : "nav-forward";
}

/** Tautan menu navbar yang memberi arah geser sesuai posisi halaman sekarang. */
export default function SlideLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const type = slideDirection(usePathname(), href);
  return (
    <Link href={href} transitionTypes={type && [type]} className={className}>
      {children}
    </Link>
  );
}
