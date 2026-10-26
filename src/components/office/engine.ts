// Mesin karakter (teknik dari Pixel Agents, MIT): jalan per petak dengan BFS, state machine
// jalan → berpose (berdiri/duduk/membaca/mengetik) → langkah berikutnya, frame sprite per keadaan.
// Murni logika (tanpa DOM) supaya mudah diuji.

import type { OfficeSnapshot } from "@/lib/present";
import {
  COLS,
  type Dir,
  FURNITURE,
  isWall,
  ROWS,
  type Sheet,
  STAFF,
  type Step,
  TILE,
  type Tile,
  WAITING_SEATS,
  WALKERS,
  WARGA_SHEETS,
} from "./layout";

const WALK_SPEED = 40; // px per detik (dunia 16 px/petak)
const WALK_FRAME = 0.15;
const TYPE_FRAME = 0.3;
const READ_FRAME = 0.7;

export type Pose = "stand" | "walk" | "sit" | "type" | "read";

export type Actor = {
  id: string;
  sheet: Sheet;
  x: number;
  y: number;
  tile: Tile;
  dir: Dir;
  pose: Pose;
  /** duduk: badan digeser turun ke kursi */
  seated: boolean;
  hidden: boolean;
  say: string | null;
  frame: number;
  timer: number;
  /** khusus petugas: zona & apakah sedang ada berkas */
  zone?: string;
  path: Tile[];
  progress: number;
  steps?: Step[];
  stepIndex: number;
  wait: number;
};

const key = (c: number, r: number) => `${c},${r}`;
const center = ([c, r]: Tile) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });

/** Petak yang tidak bisa dilewati: dinding, jejak perabot (kecuali baris latar), dan petugas. */
export function blockedTiles() {
  const blocked = new Set<string>();
  for (const f of FURNITURE) {
    if (f.wall || f.surface) continue;
    const [c0, r0] = f.at;
    for (let dc = 0; dc < f.size[0]; dc++)
      for (let dr = f.bg ?? 0; dr < f.size[1]; dr++) blocked.add(key(c0 + dc, r0 + dr));
  }
  for (const s of STAFF) blocked.add(key(...s.at));
  return blocked;
}

/** BFS 4 arah; tujuan boleh petak terblokir (kursi/sofa). Hasil tanpa petak awal. */
export function findPath(from: Tile, to: Tile, blocked: Set<string>): Tile[] {
  if (from[0] === to[0] && from[1] === to[1]) return [];
  const prev = new Map<string, string | null>([[key(...from), null]]);
  const queue: Tile[] = [from];
  const goal = key(...to);
  while (queue.length) {
    const [c, r] = queue.shift()!;
    for (const [dc, dr] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const n: Tile = [c + dc, r + dr];
      const k = key(...n);
      if (prev.has(k) || n[0] < 0 || n[1] < 2 || n[0] >= COLS || n[1] >= ROWS) continue;
      if (k !== goal && (isWall(...n) || blocked.has(k))) continue;
      prev.set(k, key(c, r));
      if (k === goal) {
        const path: Tile[] = [];
        for (let at: string | null = k; at && at !== key(...from); at = prev.get(at) ?? null) {
          const [pc, pr] = at.split(",").map(Number);
          path.unshift([pc, pr]);
        }
        return path;
      }
      queue.push(n);
    }
  }
  return [];
}

function makeActor(id: string, sheet: Sheet, tile: Tile, dir: Dir, pose: Pose, seated: boolean): Actor {
  return {
    id,
    sheet,
    ...center(tile),
    tile,
    dir,
    pose,
    seated,
    hidden: false,
    say: null,
    frame: 0,
    timer: 0,
    path: [],
    progress: 0,
    stepIndex: 0,
    wait: 0,
  };
}

/** Semua karakter untuk satu snapshot data: petugas, warga menunggu, dan pejalan berskrip. */
export function createActors(office: OfficeSnapshot): Actor[] {
  const actors: Actor[] = STAFF.map((s, i) => {
    const busy = office[s.zone].count > 0;
    const actor = makeActor(
      `staff-${i}`,
      s.sheet,
      s.at,
      s.dir,
      busy ? s.pose : s.sit ? "sit" : "stand",
      s.sit,
    );
    actor.zone = s.zone;
    return actor;
  });
  const waiting = Math.min(office.lobi.count, WAITING_SEATS.length);
  WAITING_SEATS.slice(0, waiting).forEach((seat, i) => {
    const pose: Pose = i % 3 === 1 ? "read" : "sit";
    actors.push(makeActor(`tunggu-${i}`, WARGA_SHEETS[i % WARGA_SHEETS.length], seat, "up", pose, true));
  });
  for (const w of WALKERS) {
    const actor = makeActor(w.id, w.sheet, w.start, "up", "stand", false);
    actor.steps = w.steps;
    actor.stepIndex = -1; // menunggu `delay` dulu sebelum langkah pertama
    actor.wait = w.delay;
    actor.hidden = w.delay > 0 && w.steps.at(-1)?.hide === true;
    actors.push(actor);
  }
  return actors;
}

function dirBetween([c0, r0]: Tile, [c1, r1]: Tile): Dir {
  if (c1 > c0) return "right";
  if (c1 < c0) return "left";
  return r1 > r0 ? "down" : "up";
}

function beginStep(a: Actor, blocked: Set<string>) {
  const steps = a.steps!;
  a.stepIndex = (a.stepIndex + 1) % steps.length;
  const step = steps[a.stepIndex];
  // Muncul lagi dari pintu setelah keluar kantor.
  if (a.hidden) a.hidden = false;
  a.path = findPath(a.tile, step.to, blocked);
  a.progress = 0;
  a.pose = "walk";
  a.seated = false;
  a.say = null;
  a.frame = 0;
  a.timer = 0;
}

function arrive(a: Actor) {
  const step = a.steps![a.stepIndex];
  a.dir = step.face;
  a.pose = step.pose === "sit" || step.pose === "read" ? step.pose : "stand";
  a.seated = step.pose === "sit" || step.pose === "read";
  a.say = step.say ?? null;
  a.hidden = step.hide === true;
  a.wait = step.wait;
  a.frame = 0;
  a.timer = 0;
}

/** Maju satu langkah waktu (detik). */
export function updateActor(a: Actor, dt: number, blocked: Set<string>) {
  a.timer += dt;
  if (a.pose === "type" && a.timer >= TYPE_FRAME) {
    a.timer -= TYPE_FRAME;
    a.frame = (a.frame + 1) % 2;
  } else if (a.pose === "read" && a.timer >= READ_FRAME) {
    a.timer -= READ_FRAME;
    a.frame = (a.frame + 1) % 2;
  }
  if (!a.steps) return;

  if (a.pose !== "walk") {
    a.wait -= dt;
    if (a.wait <= 0) beginStep(a, blocked);
    return;
  }

  if (a.timer >= WALK_FRAME) {
    a.timer -= WALK_FRAME;
    a.frame = (a.frame + 1) % 4;
  }
  const next = a.path[0];
  if (!next) {
    const c = center(a.tile);
    a.x = c.x;
    a.y = c.y;
    arrive(a);
    return;
  }
  a.dir = dirBetween(a.tile, next);
  a.progress += (WALK_SPEED / TILE) * dt;
  const from = center(a.tile);
  const to = center(next);
  const t = Math.min(1, a.progress);
  a.x = from.x + (to.x - from.x) * t;
  a.y = from.y + (to.y - from.y) * t;
  if (a.progress >= 1) {
    a.tile = next;
    a.path.shift();
    a.progress = 0;
  }
}

/** Kolom & baris frame di lembar sprite 7×3: bawah, atas, kanan (kiri = kanan dicerminkan). */
export function spriteFrame(a: Actor): { col: number; row: number; flip: boolean } {
  const row = a.dir === "down" ? 0 : a.dir === "up" ? 1 : 2;
  const flip = a.dir === "left";
  let col = 1; // berdiri/duduk diam = frame netral jalan
  if (a.pose === "walk") col = [0, 1, 2, 1][a.frame % 4];
  else if (a.pose === "type") col = 3 + (a.frame % 2);
  else if (a.pose === "read") col = 5 + (a.frame % 2);
  return { col, row, flip };
}
