import { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          "h-12 w-full rounded-xl border bg-surface px-4 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/60",
          error ? "border-red-500" : "border-border",
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
});
