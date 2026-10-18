import {
  BarChart3,
  BellRing,
  FilePlus2,
  FileWarning,
  LayoutDashboard,
  ListOrdered,
  Lock,
  ShieldCheck,
  Smartphone,
  Star,
  Timer,
} from "lucide-react";

/** Nama ikon di src/config/site.js → komponen lucide (config tetap data polos). */
export const ICONS = {
  bell: BellRing,
  chart: BarChart3,
  dashboard: LayoutDashboard,
  file: FilePlus2,
  fix: FileWarning,
  lock: Lock,
  phone: Smartphone,
  queue: ListOrdered,
  shield: ShieldCheck,
  star: Star,
  timer: Timer,
};

export function Icon({ name, ...props }) {
  const Component = ICONS[name];
  return Component ? <Component aria-hidden {...props} /> : null;
}
