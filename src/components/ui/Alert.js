import { cn } from "@/lib/cn";

const TONES = {
  error: "bg-late-soft text-late",
  success: "bg-ok-soft font-medium text-ok",
  warning: "border border-warn bg-warn-soft font-medium text-warn",
};

/**
 * Pesan singkat di dalam form/halaman. Error diumumkan segera ke pembaca layar
 * (role="alert"); sukses & peringatan diumumkan sopan (role="status").
 * Tidak merender apa pun jika `children` kosong.
 */
export default function Alert({ tone = "error", className, children }) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl px-3 py-2 text-sm", TONES[tone], className)}
    >
      {children}
    </p>
  );
}
