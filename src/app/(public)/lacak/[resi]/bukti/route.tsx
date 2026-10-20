import { ImageResponse } from "next/og";
import { P_GLYPH } from "@/components/Logo";
import { site } from "@/config/site";
import type { ParamsOf } from "@/lib/api";
import { getTracking } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { qrPng, siteOrigin, trackUrl } from "@/lib/qr";
import { isValidResi, normalizeResi } from "@/lib/resi";

// Gambar bukti resi (PNG) untuk disimpan di galeri HP atau dicetak. Isinya data publik
// saja (nama disamarkan), sama dengan yang terlihat siapa pun yang tahu nomor resi.
// ImageResponse (Satori): <div> berisi lebih dari satu node wajib display:flex, jadi teks
// campuran ditulis sebagai satu string.
export async function GET(_request: Request, { params }: ParamsOf<{ resi: string }>) {
  const resi = normalizeResi((await params).resi);
  const data = isValidResi(resi) ? await getTracking(resi) : null;
  if (!data) return new Response("Resi tidak ditemukan.", { status: 404 });

  const url = trackUrl(await siteOrigin(), resi);
  const qr = await qrPng(url, 420);
  const rows: [string, string][] = [
    ["Layanan", data.serviceName],
    ["Pemohon", data.applicantMasked],
    ["Diajukan", formatDateTime(data.createdAt)],
    ["Kanal", data.channel === "loket" ? "Loket pelayanan" : "Online"],
  ];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        color: "#0f1b2d",
        padding: 56,
        fontSize: 26,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#0f1b2d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="26" height="32" viewBox={P_GLYPH.viewBox} fill="#ffffff">
            <rect width={P_GLYPH.stem.width} height={P_GLYPH.stem.height} />
            <path d={P_GLYPH.bowl} fill="none" stroke="#ffffff" strokeWidth={P_GLYPH.stroke} />
            <circle {...P_GLYPH.dot} fill="#5aa2ec" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700 }}>{site.name}</div>
          <div style={{ fontSize: 20, color: "#5b6b80" }}>{site.agency}</div>
        </div>
      </div>

      <div style={{ marginTop: 44, fontSize: 22, color: "#5b6b80", letterSpacing: 2 }}>BUKTI RESI</div>
      <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: 4 }}>{resi}</div>

      <div style={{ display: "flex", marginTop: 32, gap: 40, alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse hanya mengenal <img> */}
        <img
          src={qr}
          width={300}
          height={300}
          alt=""
          style={{ border: "2px solid #dbe3ee", borderRadius: 16 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, color: "#5b6b80" }}>{label}</div>
              <div style={{ fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          borderTop: "2px dashed #dbe3ee",
          paddingTop: 24,
          fontSize: 21,
          color: "#5b6b80",
        }}
      >
        <div>{`Pindai QR atau buka ${url}`}</div>
        <div>Detail pemohon hanya terbuka dengan 4 digit terakhir nomor HP yang didaftarkan.</div>
      </div>
    </div>,
    {
      width: 900,
      height: 880,
      headers: { "Cache-Control": "private, max-age=300" },
    },
  );
}
