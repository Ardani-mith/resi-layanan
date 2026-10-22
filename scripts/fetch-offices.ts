// npm run data:offices — ambil kantor kelurahan & kecamatan se-DKI Jakarta dari OpenStreetMap
// (Overpass API) lalu simpan ke src/config/offices.json. Dijalankan manual sesekali, bukan saat
// aplikasi berjalan: peta tidak bergantung pada server luar selain tile.

import { writeFile } from "node:fs/promises";

const OUT = new URL("../src/config/offices.json", import.meta.url);
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const QUERY = `
[out:json][timeout:120];
area["name"="Daerah Khusus Ibukota Jakarta"]["admin_level"="4"]->.jkt;
nwr["name"~"^Kantor (Kelurahan|Lurah|Kecamatan|Camat) ",i](area.jkt);
out center tags;`;

interface OsmElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** "Kantor Lurah Gambir" → { type: "kelurahan", name: "Kantor Kelurahan Gambir" }. */
function classify(raw: string) {
  const match = /^Kantor (Kelurahan|Lurah|Kecamatan|Camat) (.+)$/i.exec(raw.trim());
  if (!match) return null;
  const type = /kel|lurah/i.test(match[1]) ? "kelurahan" : "kecamatan";
  const place = match[2].replace(/\s+/g, " ").trim();
  return { type, place, name: `Kantor ${type === "kelurahan" ? "Kelurahan" : "Kecamatan"} ${place}` };
}

/** Alamat dari addr:street (+ nomor) atau addr:full, dirapikan: "Jalan X Nomer 2" → "Jl. X No. 2". */
function address(tags: Record<string, string>): string {
  const street = tags["addr:street"];
  const number = tags["addr:housenumber"]?.replace(/^No\.?\s*/i, "");
  const raw = street ? (number ? `${street} No. ${number}` : street) : (tags["addr:full"] ?? "");
  return raw
    .replace(/\bJalan\b/gi, "Jl.")
    .replace(/\b(Nomer|Nomor|No)\.?\s*/gi, "No. ")
    .replace(/\s+/g, " ")
    .trim();
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function fetchOsm(): Promise<OsmElement[]> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "User-Agent": "pantas-demo/1.0 (data kantor layanan Dukcapil)" },
      body: new URLSearchParams({ data: QUERY }),
    });
    if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements;
    console.warn(`Overpass ${res.status}, coba lagi (${attempt}/5)…`);
    await new Promise((r) => setTimeout(r, attempt * 5000));
  }
  throw new Error("Overpass tidak bisa dihubungi.");
}

const elements = await fetchOsm();
// Satu kantor bisa tercatat dua kali (gedung & titik): ambil yang punya alamat.
const byId = new Map<
  string,
  { id: string; type: string; name: string; address: string; lat: number; lng: number }
>();
for (const e of elements) {
  const tags = e.tags ?? {};
  const info = classify(tags.name ?? "");
  const lat = e.lat ?? e.center?.lat;
  const lng = e.lon ?? e.center?.lon;
  if (!info || lat === undefined || lng === undefined) continue;
  const id = `${info.type === "kelurahan" ? "kel" : "kec"}-${slug(info.place)}`;
  const office = {
    id,
    type: info.type,
    name: info.name,
    address: address(tags),
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
  };
  const existing = byId.get(id);
  if (!existing || (!existing.address && office.address)) byId.set(id, office);
}
const offices = [...byId.values()];
offices.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
await writeFile(OUT, `${JSON.stringify(offices, null, 1)}\n`);
console.log(
  `✓ ${offices.length} kantor (${offices.filter((o) => o.type === "kecamatan").length} kecamatan) → src/config/offices.json`,
);
