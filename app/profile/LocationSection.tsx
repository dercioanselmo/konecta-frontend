"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { setUserLocation, ClientApiError } from "@/lib/auth/client";
import type { UserProfile } from "@/lib/auth/types";

// Leaflet touches `window` at import time — must stay out of the SSR pass.
// Reuses the same map component built for shop location (components live
// under the merchant route, but are plain, role-agnostic building blocks).
const LocationMapInner = dynamic(() => import("@/app/merchant/shops/[shopId]/location/LocationMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">A carregar mapa…</div>
  ),
});

const MAPUTO_DEFAULT: [number, number] = [-25.9692, 32.5732];

interface GeoResult {
  latitude: number;
  longitude: number;
  label: string;
}

export function LocationSection({ user, onSaved }: { user: UserProfile; onSaved: (user: UserProfile) => void }) {
  const [position, setPosition] = useState<[number, number]>(
    user.latitude != null && user.longitude != null ? [user.latitude, user.longitude] : MAPUTO_DEFAULT,
  );
  const [reverseLabel, setReverseLabel] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const [lat, lng] = position;
    const controller = new AbortController();
    queueMicrotask(() => {
      setReverseLabel(null);
      fetch(`/api/geo/reverse?lat=${lat}&lon=${lng}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { label: string | null }) => setReverseLabel(data.label))
        .catch(() => {});
    });
    return () => controller.abort();
  }, [position]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setPosition([r.latitude, r.longitude]);
    setSearchResults([]);
    setSearchInput(r.label);
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const [latitude, longitude] = position;
      const updated = await setUserLocation(latitude, longitude);
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ClientApiError
          ? (err.details?.join(" ") ?? err.message)
          : "Não foi possível guardar a localização.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Localização</h2>
        <p className="text-sm text-muted">
          Usada para mostrar lojas e produtos mais próximos de si.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Pesquisar endereço"
            placeholder="Ex.: Av. 24 de Julho, Maputo"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" className="w-auto px-6" loading={searching}>
          Pesquisar
        </Button>
      </form>

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
        <LocationMapInner latitude={position[0]} longitude={position[1]} onChange={(lat, lng) => setPosition([lat, lng])} />
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <p className="text-muted">
          Coordenadas: <span className="font-mono text-foreground">{position[0].toFixed(6)}, {position[1].toFixed(6)}</span>
        </p>
        <p className="text-muted">Endereço aproximado: {reverseLabel ?? "…"}</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {saved ? <p className="text-sm text-brand-green">Localização guardada com sucesso.</p> : null}

      <Button type="button" className="w-auto px-6" loading={saving} onClick={handleSave}>
        Guardar localização
      </Button>
    </div>
  );
}
