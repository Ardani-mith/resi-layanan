"use client";

import { Check, ChevronDown } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { FieldMessage, inputClass } from "@/components/ui";
import { cn } from "@/lib/cn";

type Option = { value: string; label: string };

/** Tinggi maksimal daftar (max-h-64) + jarak, untuk menentukan arah buka. */
const LIST_MAX_PX = 272;

/**
 * Dropdown kustom (pengganti <select> yang menu bawaannya mengikuti OS). Tombol menampilkan
 * pilihan saat ini; daftar membuka di bawahnya. Keyboard: ↑/↓ pindah, Enter/Spasi pilih, Esc
 * tutup, Home/End, dan huruf awal untuk lompat. Nilai ikut FormData lewat input tersembunyi
 * `name`; `onValueChange` untuk yang perlu tahu seketika (mis. pratinjau KTP).
 */
export default function Select({
  label,
  name,
  options,
  placeholder = "Pilih",
  error,
  hint,
  className,
  defaultValue = "",
  onValueChange,
}: {
  label: string;
  name: string;
  options: readonly Option[];
  placeholder?: string;
  error?: string | null;
  hint?: string;
  className?: string;
  /** Pilihan awal (tanpa ini = placeholder). */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Daftar membuka ke atas bila ruang di bawah tombol tidak cukup (mis. dekat dasar layar).
  const [upward, setUpward] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);
  // Pilihan yang sudah tidak tersedia (daftar berubah, mis. status kawin) tidak ikut dikirim.
  const submitted = selected ? value : "";

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const show = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const choose = (option: Option) => {
    setValue(option.value);
    onValueChange?.(option.value);
    setOpen(false);
    button.current?.focus();
  };

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    const move = (index: number) => {
      event.preventDefault();
      if (!open) show();
      else setActive(Math.min(last, Math.max(0, index)));
    };
    switch (event.key) {
      case "ArrowDown":
        return move(active + 1);
      case "ArrowUp":
        return move(active - 1);
      case "Home":
        return move(0);
      case "End":
        return move(last);
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) choose(options[active]);
        else show();
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        // Huruf awal: lompat ke pilihan pertama yang diawali huruf itu.
        if (event.key.length === 1 && /\p{L}|\d/u.test(event.key)) {
          const index = options.findIndex((o) => o.label.toLowerCase().startsWith(event.key.toLowerCase()));
          if (index >= 0) {
            if (!open) show();
            setActive(index);
          }
        }
    }
  }

  return (
    <div ref={root} className={cn("relative", className)}>
      <span id={`${id}-label`} className="mb-1.5 block text-sm font-medium">
        {label}
      </span>
      <input type="hidden" name={name} value={submitted} />
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-message` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn(
          inputClass,
          "flex cursor-pointer items-center justify-between gap-2 text-left",
          open && "border-brand ring-3 ring-brand/15",
        )}
      >
        <span id={`${id}-value`} className={cn("truncate", !selected && "text-muted/70")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className={cn(
            "absolute inset-x-0 z-30 max-h-64 animate-[select-in_120ms_ease-out] overflow-y-auto",
            "rounded-card border border-line bg-surface p-1 shadow-[0_16px_40px_-16px_rgb(15_27_45/0.35)]",
            upward ? "bottom-full mb-1.5 origin-bottom" : "top-full mt-1.5 origin-top",
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                // pointerdown: pilih sebelum tombol kehilangan fokus.
                onPointerDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onPointerEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                  index === active && "bg-surface-2",
                  isSelected && "font-medium text-brand",
                )}
              >
                {option.label}
                {isSelected && <Check aria-hidden className="size-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
      <FieldMessage id={`${id}-message`} error={error} hint={hint} />
    </div>
  );
}
