"use client";

import "leaflet/dist/leaflet.css";
import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";
import { Footprints, LocateFixed, MapPin, Navigation } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buttonClass } from "@/components/ui";
import {
  directionsUrl,
  distanceKm,
  type Office,
  OFFICE_TYPES,
  OFFICES,
  type OfficeType,
} from "@/config/offices";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

// Tile OpenStreetMap standar (gratis tanpa API key, wajib atribusi). Tampilan bersih & mode
// gelap lewat filter CSS kelas `map-tiles` (globals.css), jadi tidak perlu ganti sumber tile.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
/** Lebih jauh dari ini, lokasi pengguna dianggap di luar Jakarta. */
const FAR_KM = 50;
/** Jumlah lokasi di daftar sebelum "Lihat semua". */
const PREVIEW = 3;

type Pos = { lat: number; lng: number };
type Leaflet = typeof import("leaflet");
type Locate = "idle" | "locating" | "denied" | "error";
type Filter = OfficeType | "semua";

/** Pin per jenis lokasi: Dukcapil & MPP menonjol, kecamatan sedang, kelurahan kecil. */
function pinIcon(L: Leaflet, type: OfficeType, active: boolean): DivIcon {
  const size = type === "kelurahan" ? 28 : 36;
  const strong = type === "dukcapil" || type === "mpp";
  const tone = active
    ? "bg-brand text-on-brand ring-4 ring-brand/30"
    : strong
      ? "bg-brand text-on-brand"
      : "bg-surface text-brand";
  return L.divIcon({
    className: "",
    html: `<span class="grid place-items-center rounded-full border-2 border-white shadow-card ${tone}" style="width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" width="${size / 2}" height="${size / 2}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/** 0,04 → "40 m"; 1,83 → "1,8 km". */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

/** Isi popup dibuat lewat DOM (bukan string HTML) agar teks tidak pernah ditafsirkan sebagai HTML. */
function popupContent(office: Office): HTMLElement {
  const box = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = office.name;
  const address = document.createElement("div");
  address.textContent = office.address;
  box.append(name, address);
  return box;
}

type View = { south: number; west: number; north: number; east: number; center: Pos; zoom: number };

/** Titik awal: Jakarta Pusat. View awal (perkiraan) dipakai sebelum Leaflet selesai dimuat. */
const START: Pos = { lat: -6.1815, lng: 106.8285 };
const START_ZOOM = 14;
const INITIAL_VIEW: View = {
  south: START.lat - 0.015,
  north: START.lat + 0.015,
  west: START.lng - 0.025,
  east: START.lng + 0.025,
  center: START,
  zoom: START_ZOOM,
};
/** Kantor kelurahan (ratusan) baru ditampilkan dari zoom ini, agar peta tidak penuh sesak. */
const KELURAHAN_ZOOM = 14;

/** Peta = kantor nyata di DKI Jakarta, sedangkan instansi demo fiktif: diberi label agar tidak rancu. */
function MapBadge() {
  return (
    <span className="mt-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
      {site.demo.mapBadge}
    </span>
  );
}

type PanelProps = { offices?: Office[]; title?: string; intro?: string };

/**
 * Peta lokasi layanan. `defaultOpen={false}` = tampil sebagai satu baris ringkas dulu (Leaflet
 * belum dimuat), dipakai saat warga belum perlu datang sekarang agar halaman tidak panjang.
 */
export default function OfficeMap({
  defaultOpen = true,
  summary,
  ...props
}: PanelProps & { defaultOpen?: boolean; summary?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  if (open) return <MapPanel {...props} />;
  return (
    <section
      aria-labelledby="loket-title"
      className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-4"
    >
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"
      >
        <MapPin className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="loket-title" className="font-bold">
          {props.title ?? "Lokasi layanan terdekat"}
        </h2>
        <MapBadge />
        <p className="text-sm text-muted">
          {summary ??
            `${(props.offices ?? OFFICES).length} kantor kelurahan, kecamatan, Dukcapil, dan MPP di DKI Jakarta.`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass("secondary", "min-h-9 px-3")}
      >
        Tampilkan peta
      </button>
    </section>
  );
}

const inside = (o: Pos, v: View) =>
  o.lat >= v.south && o.lat <= v.north && o.lng >= v.west && o.lng <= v.east;

/**
 * Peta lokasi pelayanan Dukcapil seperti pencarian hotel: pin & daftar mengikuti area peta
 * yang sedang terlihat (geser/zoom = hasil diperbarui), bisa difilter per jenis, diurutkan
 * dari lokasi pengguna atau tengah peta. Leaflet dimuat di browser saja (butuh window).
 */
function MapPanel({ offices = OFFICES, title = "Lokasi layanan terdekat", intro }: PanelProps) {
  const container = useRef<HTMLDivElement>(null);
  const leaflet = useRef<{ L: Leaflet; map: LeafletMap; markers: Map<string, Marker>; user?: Marker } | null>(
    null,
  );
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [me, setMe] = useState<Pos | null>(null);
  const [locate, setLocate] = useState<Locate>("idle");
  const [filter, setFilter] = useState<Filter>("semua");
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState<string | undefined>();

  const matches = useCallback((o: Office) => filter === "semua" || o.type === filter, [filter]);
  const kelurahanHidden = view.zoom < KELURAHAN_ZOOM && (filter === "semua" || filter === "kelurahan");

  // Hasil = lokasi di area peta, urut dari lokasi saya (jika ada) atau dari tengah peta.
  const list = useMemo(() => {
    const origin = me ?? view.center;
    return offices
      .filter((o) => matches(o) && inside(o, view) && (o.type !== "kelurahan" || view.zoom >= KELURAHAN_ZOOM))
      .map((o) => ({ ...o, km: me ? distanceKm(me, o) : null, order: distanceKm(origin, o) }))
      .sort((a, b) => a.order - b.order);
  }, [offices, matches, view, me]);
  const visible = showAll ? list : list.slice(0, PREVIEW);

  // Terdekat dari lokasi saya di seluruh data (bukan hanya area peta).
  const nearest = useMemo(() => {
    if (!me) return undefined;
    let best: (Office & { km: number }) | undefined;
    for (const o of offices) {
      if (!matches(o)) continue;
      const km = distanceKm(me, o);
      if (!best || km < best.km) best = { ...o, km };
    }
    return best;
  }, [me, offices, matches]);
  const far = Boolean(nearest && nearest.km > FAR_KM);

  // Buat peta sekali; area yang terlihat dilaporkan setiap selesai geser/zoom.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      const map = L.map(container.current, { scrollWheelZoom: false }).setView(START, START_ZOOM);
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19, className: "map-tiles" }).addTo(map);
      const report = () => {
        const b = map.getBounds();
        const c = map.getCenter();
        setView({
          south: b.getSouth(),
          north: b.getNorth(),
          west: b.getWest(),
          east: b.getEast(),
          center: { lat: c.lat, lng: c.lng },
          zoom: map.getZoom(),
        });
      };
      map.on("moveend", report);
      // Gulir = zoom hanya setelah peta diklik, supaya halaman tetap bisa digulir melewati peta.
      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("mouseout", () => map.scrollWheelZoom.disable());
      leaflet.current = { L, map, markers: new Map() };
      report();
    });
    return () => {
      cancelled = true;
      leaflet.current?.map.remove();
      leaflet.current = null;
    };
  }, []);

  // Pin = hasil di area peta; dibuat saat pertama dibutuhkan, dilepas saat keluar area/filter.
  useEffect(() => {
    const current = leaflet.current;
    if (!current) return;
    const { L, map, markers } = current;
    const ids = new Set(list.map((o) => o.id));
    for (const [id, marker] of markers) if (!ids.has(id) && map.hasLayer(marker)) marker.remove();
    for (const office of list) {
      let marker = markers.get(office.id);
      if (!marker) {
        marker = L.marker([office.lat, office.lng], { title: office.name }).bindPopup(popupContent(office));
        marker.on("click", () => setActive(office.id));
        markers.set(office.id, marker);
      }
      marker.setIcon(pinIcon(L, office.type, office.id === active));
      if (!map.hasLayer(marker)) marker.addTo(map);
    }
  }, [list, active]);

  function focus(office: Office) {
    setActive(office.id);
    const current = leaflet.current;
    if (!current) return;
    current.map.flyTo([office.lat, office.lng], Math.max(current.map.getZoom(), 16), { duration: 0.6 });
    current.markers.get(office.id)?.openPopup();
  }

  /** Ganti jenis; jika tidak ada di area peta, pindah ke lokasi terdekat jenis itu. */
  function chooseFilter(next: Filter) {
    setFilter(next);
    setShowAll(false);
    const current = leaflet.current;
    if (!current || next === "semua") return;
    const origin = me ?? view.center;
    const ofType = offices.filter((o) => o.type === next);
    if (ofType.some((o) => inside(o, view))) return;
    const closest = ofType.sort((a, b) => distanceKm(origin, a) - distanceKm(origin, b)).slice(0, 3);
    if (!closest.length) return;
    const zoom = next === "kelurahan" ? KELURAHAN_ZOOM + 1 : 15;
    current.map.flyToBounds(current.L.latLngBounds([origin, ...closest]), {
      padding: [48, 48],
      maxZoom: zoom,
    });
  }

  /** Titik biru lokasi saya, lalu bingkai ke lokasi terdekat (sekali, saat lokasi didapat). */
  function showMe(pos: Pos) {
    const current = leaflet.current;
    if (!current) return;
    const { L, map } = current;
    current.user?.remove();
    current.user = L.marker([pos.lat, pos.lng], {
      icon: L.divIcon({
        className: "",
        html: '<span class="block size-4 rounded-full border-2 border-white bg-run shadow-card ring-4 ring-run/30"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      title: "Lokasi Anda",
    }).addTo(map);
    let best: Office | undefined;
    for (const o of offices) {
      if (matches(o) && (!best || distanceKm(pos, o) < distanceKm(pos, best))) best = o;
    }
    if (!best) return;
    if (distanceKm(pos, best) <= FAR_KM) {
      map.fitBounds(L.latLngBounds([pos, best]), { padding: [56, 56], maxZoom: 16 });
    }
    setActive(best.id);
  }

  function findMe() {
    if (!("geolocation" in navigator)) return setLocate("error");
    setLocate("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setMe(pos);
        setLocate("idle");
        showMe(pos);
      },
      (err) => setLocate(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const filters: [Filter, string][] = [
    ["semua", "Semua"],
    ...(Object.entries(OFFICE_TYPES) as [OfficeType, { label: string }][]).map(
      ([type, { label }]): [Filter, string] => [type, label],
    ),
  ];

  return (
    <section
      aria-labelledby="loket-title"
      className="@container rounded-card border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="loket-title" className="text-lg font-bold">
            {title}
          </h2>
          <MapBadge />
          {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
        </div>
        <button
          type="button"
          onClick={findMe}
          disabled={locate === "locating"}
          className={buttonClass("secondary", "min-h-9 px-3")}
        >
          <LocateFixed aria-hidden className="size-4" />
          {locate === "locating" ? "Mencari lokasi…" : "Gunakan lokasi saya"}
        </button>
      </div>

      <div role="group" aria-label="Jenis lokasi" className="mt-4 flex flex-wrap gap-1.5">
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => chooseFilter(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              filter === value
                ? "border-brand bg-brand text-on-brand"
                : "border-line text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {(locate === "denied" || locate === "error" || far) && (
        <p role="status" className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          {locate === "denied"
            ? "Izin lokasi ditolak. Lokasi tetap bisa dipilih dari daftar."
            : locate === "error"
              ? "Lokasi tidak bisa didapat. Coba lagi atau pilih dari daftar."
              : `Anda sekitar ${Math.round(nearest?.km ?? 0)} km dari lokasi terdekat. Peta ini menampilkan lokasi di DKI Jakarta.`}
        </p>
      )}

      <div className="mt-4 grid gap-4 @2xl:grid-cols-[1fr_18rem]">
        {/* isolate: z-index panel Leaflet tidak menembus navbar yang sticky. */}
        <div
          ref={container}
          role="region"
          aria-label="Peta lokasi layanan"
          className="relative isolate z-0 h-80 overflow-hidden rounded-xl border border-line bg-surface-2 @2xl:h-auto @2xl:min-h-[26rem]"
        />
        <div className="space-y-2">
          <p role="status" className="text-sm">
            <span className="font-semibold">{list.length} lokasi</span>{" "}
            <span className="text-muted">di area peta ini</span>
            {kelurahanHidden && (
              <span className="block text-xs text-muted">Perbesar peta untuk melihat kantor kelurahan.</span>
            )}
          </p>
          {list.length === 0 && (
            <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
              Tidak ada lokasi di area ini. Geser atau perkecil peta.
            </p>
          )}
          <ol className="space-y-2">
            {visible.map((office) => (
              <li key={office.id}>
                <div
                  className={cn(
                    "rounded-xl border p-3 text-sm transition-colors",
                    office.id === active ? "border-brand bg-brand-soft" : "border-line",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => focus(office)}
                    className="flex w-full items-start gap-2 text-left"
                  >
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{office.name}</span>
                      <span className="block text-muted">{office.address}</span>
                      <span className="mt-1 block text-xs text-muted">
                        <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-semibold text-text">
                          {OFFICE_TYPES[office.type].label}
                        </span>{" "}
                        {OFFICE_TYPES[office.type].scope}
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-2 pl-6">
                    <span className="text-xs font-semibold text-text tabular-nums">
                      {office.km === null ? "" : formatDistance(office.km)}
                      {office.id === nearest?.id && !far && <span className="ml-1 text-ok">· terdekat</span>}
                    </span>
                    <a
                      href={directionsUrl(office)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                    >
                      <Navigation aria-hidden className="size-3.5" />
                      Petunjuk arah
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {list.length > PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full rounded-xl border border-dashed border-line py-2 text-sm font-semibold text-brand hover:bg-surface-2"
            >
              {showAll ? "Tampilkan lebih sedikit" : `Lihat semua (${list.length})`}
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 flex gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
        <Footprints aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          <span className="font-semibold">Program Jemput Bola:</span> kelurahan, kecamatan, atau Dukcapil juga
          melayani perekaman di luar kantor, misalnya di sekolah atau mendatangi warga lansia dan penyandang
          disabilitas. Tanyakan jadwalnya ke kantor kelurahan sesuai domisili Anda.
        </span>
      </p>
      <p className="mt-3 text-xs text-muted">
        Kantor kelurahan & kecamatan se-DKI Jakarta, Suku Dinas Dukcapil Jakarta Pusat, dan MPP DKI Jakarta
        (data OpenStreetMap), ditampilkan sebagai contoh. Pastikan jam layanan sebelum datang. Geser atau
        perbesar peta untuk mencari lokasi lain; klik peta lalu gulir untuk zoom.
      </p>
    </section>
  );
}
