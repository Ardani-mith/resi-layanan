import { useId } from "react";

/** Input berlabel dengan pesan error yang terhubung lewat aria-describedby. */
export default function Field({ label, error, hint, className = "", ...props }) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand aria-invalid:border-late"
        {...props}
      />
      {(error || hint) && (
        <p id={messageId} className={`mt-1 text-sm ${error ? "text-late" : "text-muted"}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
