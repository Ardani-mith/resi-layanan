"use client";

import { unstable_rethrow, useRouter } from "next/navigation";
import { Component, type ReactNode, startTransition } from "react";

type Props = { message?: string; children: ReactNode };

/**
 * Batas error untuk satu bagian halaman: jika bagian di dalamnya gagal (mis. database tidak
 * terjangkau), hanya bagian ini yang diganti pesan, sisa halaman tetap jalan. Sinyal internal
 * Next (redirect, notFound) diteruskan lewat `unstable_rethrow`. "Coba lagi" memuat ulang data
 * server lalu merender bagian ini lagi.
 *
 * Sengaja tidak memakai `catchError` dari `next/error`: modul CJS-nya mendefinisikan ulang
 * properti yang sama saat dievaluasi dua kali di dev ("Cannot redefine property: catchError").
 */
class Boundary extends Component<Props & { onRetry: (reset: () => void) => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(error: unknown) {
    unstable_rethrow(error);
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-5 text-sm text-muted"
      >
        <p>{this.props.message ?? "Bagian ini sementara tidak dapat dimuat."}</p>
        <button
          type="button"
          onClick={() => this.props.onRetry(() => this.setState({ failed: false }))}
          className="font-semibold text-brand hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }
}

export default function SectionError(props: Props) {
  const router = useRouter();
  return (
    <Boundary
      {...props}
      onRetry={(reset) =>
        startTransition(() => {
          router.refresh();
          reset();
        })
      }
    />
  );
}
