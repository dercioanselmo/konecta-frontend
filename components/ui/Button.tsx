import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand-green text-white hover:bg-emerald-600",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-surface-hover",
        variant === "ghost" && "text-foreground hover:bg-surface",
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : null}
      {children}
    </button>
  );
});
