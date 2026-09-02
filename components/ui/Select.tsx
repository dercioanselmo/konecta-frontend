import { forwardRef, type SelectHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className, children, ...props },
  ref,
) {
  const selectId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={clsx(
          "h-12 w-full rounded-xl border bg-surface px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-brand-green/60",
          error ? "border-red-500" : "border-border",
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={`${selectId}-error`} className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
});
