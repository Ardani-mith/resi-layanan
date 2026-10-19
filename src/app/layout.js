import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { site } from "@/config/site";
import { themeScript } from "@/lib/theme";

// next/font mengunduh font saat build dan menyajikannya dari domain sendiri (self-hosted).
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

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

export default function RootLayout({ children }) {
  return (
    // data-theme dipasang skrip tema sebelum hydration; ekstensi browser (Dark Reader, Grammarly,
    // penerjemah) juga sering menyisipkan atribut ke <html>. suppressHydrationWarning hanya berlaku
    // untuk atribut elemen ini, tidak untuk anak-anaknya, jadi mismatch sungguhan tetap terdeteksi.
    <html lang="id" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
