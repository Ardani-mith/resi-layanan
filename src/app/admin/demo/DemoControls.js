"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";

export default function DemoControls({ hasOffset }) {
  const router = useRouter();
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState(null);

  async function send(key, body) {
    setPending(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/demo/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ tone: "error", text: json.error.message });
        return;
      }
      const { offsetDays, escalated, cancelled } = json.data;
      setMessage({
        tone: "ok",
        text: body.reset
          ? `Jam sistem kembali ke waktu nyata. Eskalasi simulasi dibatalkan pada ${cancelled} permohonan.`
          : `Jam sistem sekarang +${offsetDays.toLocaleString("id-ID")} hari. ${escalated} eskalasi baru tercatat.`,
      });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending !== null} onClick={() => send("1", { days: 1 })} className={buttonClass("primary")}>
          {pending === "1" ? "Memajukan…" : "Majukan +1 hari"}
        </button>
        <button type="button" disabled={pending !== null} onClick={() => send("2", { days: 2 })} className={buttonClass("secondary")}>
          {pending === "2" ? "Memajukan…" : "Majukan +2 hari"}
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
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${message.tone === "error" ? "bg-late-soft text-late" : "bg-ok-soft text-ok"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
