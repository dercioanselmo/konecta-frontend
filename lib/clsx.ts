import { twMerge } from "tailwind-merge";

type ClassValue = string | false | null | undefined;

/**
 * Joins classes AND resolves conflicting Tailwind utilities (e.g. a base
 * `w-full` vs. a caller's override `w-auto`) by keeping the last one that
 * wins semantically, not whichever happens to come later in Tailwind's own
 * generated stylesheet order. Plain string concatenation here was a real
 * bug: `w-full` (base) and `w-auto` (override) could both end up in the
 * class list with the override silently losing depending on CSS source
 * order — e.g. Button's "Enviar foto" rendering full-width despite an
 * explicit `w-auto` override.
 */
export function clsx(...values: ClassValue[]): string {
  return twMerge(values.filter(Boolean).join(" "));
}
