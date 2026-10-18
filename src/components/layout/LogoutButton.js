"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/http";

export default function LogoutButton({ className }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await postJson("/api/auth/logout");
    router.replace("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={pending} className={className}>
      {pending ? "Keluar…" : "Keluar"}
    </button>
  );
}
