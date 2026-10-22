// Lokasi pelayanan administrasi kependudukan SUNGGUHAN di DKI Jakarta, dipakai sebagai contoh
// lokasi untuk demo. Kantor kelurahan & kecamatan dari OpenStreetMap (offices.json, Oktober 2026);
// MPP & Suku Dinas Dukcapil Jakarta Pusat dicek silang dengan berita/direktori publik.
// Jam layanan sengaja tidak dicantumkan per kantor: berubah-ubah, warga diminta memastikan.

import osmOffices from "./offices.json";

export const OFFICE_TYPES = {
  kelurahan: { label: "Kelurahan", scope: "Sesuai domisili di KTP/KK" },
  kecamatan: { label: "Kecamatan", scope: "Untuk warga di wilayah kecamatan ini" },
  dukcapil: { label: "Dukcapil", scope: "Untuk seluruh warga Jakarta Pusat" },
  mpp: { label: "Mal Pelayanan Publik", scope: "Untuk seluruh warga DKI Jakarta" },
} as const;
export type OfficeType = keyof typeof OFFICE_TYPES;

export interface Office {
  id: string;
  type: OfficeType;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Kantor yang dicek manual; kantor kelurahan & kecamatan se-DKI Jakarta ada di offices.json
// (dari OpenStreetMap, perbarui dengan `npm run data:offices`).
// prettier-ignore
const MANUAL: Office[] = [
  { id: "sudin-jp", type: "dukcapil", name: "Suku Dinas Dukcapil Jakarta Pusat", address: "Kantor Wali Kota Jakarta Pusat, Jl. Tanah Abang I No. 1, Blok C, Petojo Selatan, Gambir", lat: -6.17326, lng: 106.81876 },
  { id: "mpp-dki", type: "mpp", name: "Mal Pelayanan Publik DKI Jakarta", address: "Jl. H.R. Rasuna Said Kav. C-22, Karet Kuningan, Setiabudi", lat: -6.22307, lng: 106.83382 },
];

export const OFFICES: Office[] = [...MANUAL, ...(osmOffices as Office[])];

/** Jarak garis lurus (km) antara dua titik, rumus haversine. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Tautan petunjuk arah Google Maps ke kantor (dibuka di tab baru). */
export const directionsUrl = (o: Office) =>
  `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`;
