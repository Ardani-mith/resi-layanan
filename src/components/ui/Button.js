import Link from "next/link";

const VARIANTS = {
  primary: "bg-brand text-on-brand hover:bg-brand-strong",
  secondary: "border border-line bg-surface text-text hover:bg-surface-2",
  danger: "bg-late text-surface hover:opacity-90",
  ghost: "text-brand hover:bg-brand-soft",
};

export function buttonClass(variant = "primary", extra = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${extra}`;
}

export default function Button({ variant = "primary", className = "", href, ...props }) {
  if (href) return <Link href={href} className={buttonClass(variant, className)} {...props} />;
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}
