"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Leaflet touches `window` at import time — must stay out of the SSR pass.
// Reuses the same map component built for shop location (components live
// under the merchant route, but are plain, role-agnostic building blocks).
const LocationMapInner = dynamic(() => import("@/app/merchant/shops/[shopId]/location/LocationMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">A carregar mapa…</div>
  ),
});

export const MAPUTO_DEFAULT: [number, number] = [-25.9692, 32.5732];

interface GeoResult {
  latitude: number;
  longitude: number;
  label: string;
}

/**
 * Pure, controlled map + address-search picker — no save button, no API
 * calls of its own. The caller owns the current position and decides when
 * (and whether) to persist it; this just reports changes via `onChange`.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [reverseLabel, setReverseLabel] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      setReverseLabel(null);
      fetch(`/api/geo/reverse?lat=${latitude}&lon=${longitude}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { label: string | null }) => setReverseLabel(data.label))
        .catch(() => {});
    });
    return () => controller.abort();
  }, [latitude, longitude]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(searchInput.trim())}`);
      const results: GeoResult[] = await res.json();
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (r: GeoResult) => {
    onChange(r.latitude, r.longitude);
    setSearchResults([]);
    setSearchInput(r.label);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Not a <form> — this component is used inside the profile page's
          own outer <form>, and nested forms are invalid HTML (the browser
          would treat "Enter" here as submitting the outer form instead). */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Pesquisar endereço"
            placeholder="Ex.: Av. 24 de Julho, Maputo"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
        </div>
        <Button type="button" variant="secondary" className="w-auto px-6" loading={searching} onClick={handleSearch}>
          Pesquisar
        </Button>
      </div>

      {searchResults.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-2">
          {searchResults.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickResult(r)}
              className="rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="h-64 w-full overflow-hidden rounded-2xl border border-border">
        <LocationMapInner latitude={latitude} longitude={longitude} onChange={onChange} />
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <p className="text-muted">
          Coordenadas: <span className="font-mono text-foreground">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
        </p>
        <p className="text-muted">Endereço aproximado: {reverseLabel ?? "…"}</p>
      </div>
    </div>
  );
}
