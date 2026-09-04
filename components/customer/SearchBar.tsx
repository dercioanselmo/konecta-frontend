/**
 * Visual-only search entry point — present on every customer browsing
 * screen (Home, category shop grid, store subcategory grid, product
 * grid). Not wired up yet: real search is a later phase (AGENTS.md's
 * Customer plan lists it right after Home) — this is an honest
 * placeholder, not a fake/dead search that pretends to work.
 */
export function SearchBar() {
  return (
    <div className="flex h-12 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-muted">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4.5 w-4.5 shrink-0">
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <span className="text-sm">O que procura hoje?</span>
    </div>
  );
}
