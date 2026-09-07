"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  getCourierProfile,
  listNearbyShopsForCourier,
  listCourierShops,
  requestShopAssociation,
  withdrawShopAssociation,
} from "@/lib/courier/client";
import { ASSOCIATION_STATUS_LABELS, type CourierShopAssociation, type NearbyShopForCourier } from "@/lib/courier/types";
import { ClientApiError } from "@/lib/auth/client";

const FAR_THRESHOLD_KM = 2;

export function CourierStoresView() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableShops, setAvailableShops] = useState<NearbyShopForCourier[]>([]);
  const [myShops, setMyShops] = useState<CourierShopAssociation[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyShopId, setBusyShopId] = useState<string | null>(null);
  const [confirmShop, setConfirmShop] = useState<NearbyShopForCourier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const profile = await getCourierProfile();
      const [available, mine] = await Promise.all([
        listNearbyShopsForCourier(profile.baseLatitude, profile.baseLongitude),
        listCourierShops(),
      ]);
      setAvailableShops(available);
      setMyShops(mine);
    } catch (err) {
      setLoadError(
        err instanceof ClientApiError
          ? err.message
          : "Não foi possível carregar as lojas. Conclua primeiro o seu perfil.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

  const associate = async (shop: NearbyShopForCourier) => {
    setActionError(null);
    setBusyShopId(shop.id);
    try {
      const association = await requestShopAssociation(shop.id);
      setMyShops((prev) => [...prev, association]);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível associar-se a esta loja.");
    } finally {
      setBusyShopId(null);
    }
  };

  const handleAssociateClick = (shop: NearbyShopForCourier) => {
    if (shop.distanceKm > FAR_THRESHOLD_KM) {
      setConfirmShop(shop);
      return;
    }
    void associate(shop);
  };

  const withdraw = async (shopId: string) => {
    setActionError(null);
    setBusyShopId(shopId);
    try {
      await withdrawShopAssociation(shopId);
      setMyShops((prev) => prev.filter((s) => s.shopId !== shopId));
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível remover a associação.");
    } finally {
      setBusyShopId(null);
    }
  };

  const associatedIds = new Set(myShops.map((s) => s.shopId));
  const selectable = [...availableShops].sort((a, b) => a.distanceKm - b.distanceKm);

  if (loading) {
    return <p className="text-sm text-muted">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Lojas</h1>
        <p className="mt-1 text-sm text-muted">
          Associe-se às lojas onde quer trabalhar — ordenadas pelas mais próximas da sua base.
        </p>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">
          {loadError} <Link href="/courier/onboarding" className="font-semibold underline">Concluir perfil →</Link>
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-foreground">As suas lojas</h2>
            {myShops.length === 0 ? (
              <p className="text-sm text-muted">Ainda não está associado a nenhuma loja.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {myShops.map((s) => (
                  <div key={s.shopId} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-3">
                      {s.shopLogoUrl ? (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                          <Image src={s.shopLogoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                        </div>
                      ) : null}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.shopName}</p>
                        <p className="text-xs text-muted">
                          {s.distanceKm.toFixed(1)} km · {ASSOCIATION_STATUS_LABELS[s.status]}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 w-auto px-3 text-xs"
                      loading={busyShopId === s.shopId}
                      onClick={() => withdraw(s.shopId)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-foreground">Todas as lojas</h2>
            {selectable.length === 0 ? (
              <p className="text-sm text-muted">Não há lojas disponíveis de momento.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectable.map((shop) => {
                  const alreadyAssociated = associatedIds.has(shop.id);
                  return (
                    <div key={shop.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                      <div className="flex items-center gap-3">
                        {shop.logoUrl ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                            <Image src={shop.logoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                          </div>
                        ) : null}
                        <div>
                          <p className="text-sm font-semibold text-foreground">{shop.name}</p>
                          <p className="text-xs text-muted">{shop.distanceKm.toFixed(1)} km · {shop.isOpen ? "Aberta" : "Fechada"}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 w-auto px-3 text-xs"
                        disabled={alreadyAssociated}
                        loading={busyShopId === shop.id}
                        onClick={() => handleAssociateClick(shop)}
                      >
                        {alreadyAssociated ? "Já associado" : "Associar-me"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmShop != null}
        title="Loja distante"
        message={
          confirmShop
            ? `Esta loja fica a ${confirmShop.distanceKm.toFixed(1)} km da sua base — mais do que o habitual (2 km). Quer mesmo associar-se?`
            : ""
        }
        confirmLabel="Sim, associar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (confirmShop) void associate(confirmShop);
          setConfirmShop(null);
        }}
        onCancel={() => setConfirmShop(null)}
      />
    </div>
  );
}
