"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getShop, setShopLocation } from "@/lib/stores/client";
import { ClientApiError } from "@/lib/auth/client";
import type { Shop } from "@/lib/stores/types";

// Leaflet touches `window` at import time — must stay out of the SSR pass.
const LocationMapInner = dynamic(() => import("./LocationMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">A carregar mapa…</div>
  ),
});

const MAPUTO_DEFAULT: [number, number] = [-25.9692, 32.5732];

interface LocationFormProps {
  shopId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

interface GeoResult {
  latitude: number;
  longitude: number;
  label: string;
}

export function LocationForm({
  shopId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: LocationFormProps) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [position, setPosition] = useState<[number, number]>(MAPUTO_DEFAULT);
  const [reverseLabel, setReverseLabel] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const s = await getShop(shopId);
      setShop(s);
      if (s.latitude != null && s.longitude != null) {
        setPosition([s.latitude, s.longitude]);
      }
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar a loja.");
    }
  }, [shopId]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  // Reverse-geocode whenever the pin settles somewhere new, so the merchant
  // can sanity-check the address rather than trusting raw coordinates.
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
    setActionError(null);
    setSaved(false);
    setSaving(true);
    try {
      const [latitude, longitude] = position;
      const updated = await setShopLocation(shopId, { latitude, longitude });
      setShop(updated);
      setSaved(true);
    } catch (err) {
      setActionError(
        err instanceof ClientApiError
          ? (err.details?.join(" ") ?? err.message)
          : "Não foi possível guardar a localização.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <ShopNav shopId={shopId} shopName="Loja" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />
        <p className="text-sm text-red-500">{loadError}</p>
      </div>
    );
  }

  if (!shop) {
    return <p className="text-sm text-muted">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shop.id} shopName={shop.name} hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <p className="text-sm text-muted">
        Marque a localização exata da loja — clique no mapa ou arraste o marcador para ajustar. Usada para
        ordenar lojas por proximidade na app do cliente.
      </p>

      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px] flex-1">
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
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-2">
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

      <div className="h-80 w-full overflow-hidden rounded-2xl border border-border">
        <LocationMapInner latitude={position[0]} longitude={position[1]} onChange={(lat, lng) => setPosition([lat, lng])} />
      </div>

      <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="text-muted">
          Coordenadas: <span className="font-mono text-foreground">{position[0].toFixed(6)}, {position[1].toFixed(6)}</span>
        </p>
        <p className="text-muted">Endereço aproximado: {reverseLabel ?? "…"}</p>
      </div>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
      {saved ? <p className="text-sm text-brand-green">Localização guardada com sucesso.</p> : null}

      <Button type="button" className="mt-2 w-auto px-6" loading={saving} onClick={handleSave}>
        Guardar localização
      </Button>
    </div>
  );
}
