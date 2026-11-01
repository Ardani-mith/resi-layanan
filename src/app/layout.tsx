import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { site } from "@/config/site";
import { themeScript } from "@/lib/theme";

// next/font mengunduh font saat build dan menyajikannya dari domain sendiri (self-hosted).
// Geist: sans geometris yang rapat untuk judul besar, tetap jelas di ukuran kecil.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
// Mono untuk nomor resi, angka, dan "struk" di beranda: identitas visual Pantas (resi = struk).
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata = {
  title: { default: `${site.name}: lacak layanan publik`, template: `%s · ${site.name}` },
  description: site.description,
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme dipasang skrip tema sebelum hydration; ekstensi browser (Dark Reader, Grammarly,
    // penerjemah) juga sering menyisipkan atribut ke <html>. suppressHydrationWarning hanya berlaku
    // untuk atribut elemen ini, tidak untuk anak-anaknya, jadi mismatch sungguhan tetap terdeteksi.
    <html
      lang="id"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* Kerangka halaman ada di route group: (public) navbar atas, (staff) top bar. */}
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
