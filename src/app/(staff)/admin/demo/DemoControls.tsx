"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, buttonClass } from "@/components/ui";
import { postJson } from "@/lib/http";

type Result = { offsetDays: number; escalated: number; cancelled: number };

export default function DemoControls({ hasOffset }: { hasOffset: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function send(key: string, body: { days?: number; reset?: boolean }) {
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
        : `Jam sistem dimajukan ${body.days} hari kerja (total +${offsetDays.toLocaleString("id-ID", { maximumFractionDigits: 1 })} hari kalender). ${escalated} eskalasi baru tercatat.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => send("1", { days: 1 })}
          className={buttonClass("primary")}
        >
          {pending === "1" ? "Memajukan…" : "Majukan +1 hari kerja"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => send("2", { days: 2 })}
          className={buttonClass("secondary")}
        >
          {pending === "2" ? "Memajukan…" : "Majukan +2 hari kerja"}
        </button>
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
