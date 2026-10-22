"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, buttonClass } from "@/components/ui";
import { formatWorkHours } from "@/lib/format";
import { postJson } from "@/lib/http";

/** Langkah maju jam demo, dalam jam kerja. */
const STEPS = [1, 4, 8];

type Result = { offsetDays: number; escalated: number; cancelled: number };

export default function DemoControls({ hasOffset }: { hasOffset: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function send(key: string, body: { hours?: number; reset?: boolean }) {
    setPending(key);
    setMessage(null);
    const res = await postJson<Result>("/api/admin/demo/advance", body);
    setPending(null);
    if (!res.ok) {
      setMessage({ tone: "error", text: res.error.message });
      return;
    }
    const { offsetDays, escalated, cancelled } = res.data;
    setMessage({
      tone: "success",
      text: body.reset
        ? `Jam sistem kembali ke waktu nyata. Eskalasi simulasi dibatalkan pada ${cancelled} permohonan.`
        : `Jam sistem dimajukan ${formatWorkHours(body.hours)} (total +${offsetDays.toLocaleString("id-ID", { maximumFractionDigits: 1 })} hari kalender). ${escalated} eskalasi baru tercatat.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((hours, i) => (
          <button
            key={hours}
            type="button"
            disabled={pending !== null}
            onClick={() => send(String(hours), { hours })}
            className={buttonClass(i === 0 ? "primary" : "secondary")}
          >
            {pending === String(hours) ? "Memajukan…" : `Majukan +${formatWorkHours(hours)}`}
          </button>
        ))}
        <button
          type="button"
          disabled={pending !== null || !hasOffset}
          onClick={() => send("reset", { reset: true })}
          className={buttonClass("secondary")}
        >
          {pending === "reset" ? "Mengembalikan…" : "Kembali ke waktu nyata"}
        </button>
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </div>
  );
}
