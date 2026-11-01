"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Hitung mundur hiasan (jj:mm:dd) yang benar-benar berjalan; render server = nilai awal. */
export default function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : seconds)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  return (
    <span className="tabular-nums">
      {pad(Math.floor(left / 3600))}:{pad(Math.floor((left % 3600) / 60))}:{pad(left % 60)}
    </span>
  );
}
