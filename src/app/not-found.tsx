import { NotFoundView } from "@/components/ui";
// Cadangan terakhir. Alamat tak dikenal ditangkap (public)/[...missing] agar tampil dengan
// navbar; notFound() di dalam group memakai not-found.tsx milik group itu.
export default function NotFound() {
  return <NotFoundView />;
}
