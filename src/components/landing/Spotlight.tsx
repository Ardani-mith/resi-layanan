// Sorot cahaya lembut di latar hero. Diadaptasi dari komponen "Spotlight" Aceternity UI
// (ui.aceternity.com): elips putih yang di-blur, masuk sekali dari kiri atas. Tanpa JavaScript;
// animasinya mati untuk pengguna "kurangi gerakan" (langsung tampil di posisi akhir).

import { cn } from "@/lib/cn";

export default function Spotlight({ className, fill = "white" }: { className?: string; fill?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 3787 2842"
      fill="none"
      className={cn(
        "pointer-events-none absolute h-[169%] w-[138%] -translate-x-1/2 -translate-y-[40%] motion-safe:animate-spotlight motion-safe:opacity-0 lg:w-[84%]",
        className,
      )}
    >
      <g filter="url(#spotlight-blur)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter
          id="spotlight-blur"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
}
