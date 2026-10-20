import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

// QR berisi tautan halaman lacak, jadi dipindai dari kamera HP mana pun langsung terbuka.
// Warna gelap tetap di atas putih di kedua tema: kontras penuh adalah syarat QR terbaca.
const QR_OPTIONS = {
  margin: 1,
  errorCorrectionLevel: "M",
  color: { dark: "#0f1b2d", light: "#ffffff" },
} as const;

/** Origin situs: SITE_URL (produksi) atau host dari request saat ini. */
export async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const trackUrl = (origin: string, resi: string) => `${origin}/lacak/${resi}`;

/** Markup <svg> QR untuk ditanam langsung di halaman. */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
}

/** QR sebagai data URL PNG (untuk gambar bukti resi). */
export function qrPng(url: string, width = 360): Promise<string> {
  return QRCode.toDataURL(url, { ...QR_OPTIONS, width });
}

/** Data siap pakai untuk <ReceiptCard>. */
export async function receiptFor(resi: string) {
  const url = trackUrl(await siteOrigin(), resi);
  return { resi, url, qr: await qrSvg(url) };
}
export type Receipt = Awaited<ReturnType<typeof receiptFor>>;
