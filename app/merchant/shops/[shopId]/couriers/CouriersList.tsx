"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { listShopCouriers, setCourierStatus, rejectCourier } from "@/lib/courier/client";
import { ClientApiError } from "@/lib/auth/client";
import { ASSOCIATION_STATUS_LABELS, TRANSPORT_LABELS, type AssociationStatus, type ShopCourier } from "@/lib/courier/types";

interface CouriersListProps {
  shopId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

const TABS: { value: AssociationStatus; label: string }[] = [
  { value: "PENDING_STORE_APPROVAL", label: "Pendentes" },
  { value: "ACTIVE", label: "Ativos" },
  { value: "SUSPENDED", label: "Suspensos" },
];

const TONE: Record<AssociationStatus, "warning" | "success" | "neutral"> = {
  PENDING_STORE_APPROVAL: "warning",
  ACTIVE: "success",
  SUSPENDED: "neutral",
};

export function CouriersList({
  shopId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: CouriersListProps) {
  const [tab, setTab] = useState<AssociationStatus>("PENDING_STORE_APPROVAL");
  const [couriers, setCouriers] = useState<ShopCourier[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const all = await listShopCouriers(shopId);
      setCouriers(all);
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar os entregadores.");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

  const approve = async (courierId: string) => {
    setActionError(null);
    setBusyId(courierId);
    try {
      const updated = await setCourierStatus(shopId, courierId, "ACTIVE");
      setCouriers((prev) => prev.map((c) => (c.courierId === courierId ? updated : c)));
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível aprovar o entregador.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (courierId: string) => {
    setActionError(null);
    setBusyId(courierId);
    try {
      await rejectCourier(shopId, courierId);
      setCouriers((prev) => prev.filter((c) => c.courierId !== courierId));
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível rejeitar o entregador.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleSuspend = async (courier: ShopCourier) => {
    setActionError(null);
    setBusyId(courier.courierId);
    try {
      const updated = await setCourierStatus(shopId, courier.courierId, courier.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      setCouriers((prev) => prev.map((c) => (c.courierId === courier.courierId ? updated : c)));
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar o entregador.");
    } finally {
      setBusyId(null);
    }
  };

  const visible = couriers.filter((c) => c.status === tab);

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <h2 className="text-xl font-bold text-foreground">Entregadores</h2>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-border bg-surface text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

      {loading ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : loadError ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700">{loadError}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted">Nenhum entregador nesta categoria.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((courier) => (
            <div key={courier.courierId} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
              <Link href={`${basePath}/${shopId}/couriers/${courier.courierId}`} className="flex min-w-0 items-center gap-3">
                {courier.photoUrl ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                    <Image src={courier.photoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{courier.courierName}</p>
                  <p className="text-xs text-muted">
                    {courier.courierPhone} · {TRANSPORT_LABELS[courier.transportType]}
                    {courier.plateNumber ? ` (${courier.plateNumber})` : ""} · {courier.distanceKm.toFixed(1)} km
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={TONE[courier.status]}>{ASSOCIATION_STATUS_LABELS[courier.status]}</Badge>
                {courier.status === "PENDING_STORE_APPROVAL" ? (
                  <>
                    <Button type="button" className="h-9 w-auto px-3 text-xs" loading={busyId === courier.courierId} onClick={() => approve(courier.courierId)}>
                      Aprovar
                    </Button>
                    <Button type="button" variant="secondary" className="h-9 w-auto px-3 text-xs text-red-600" loading={busyId === courier.courierId} onClick={() => reject(courier.courierId)}>
                      Rejeitar
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="secondary" className="h-9 w-auto px-3 text-xs" loading={busyId === courier.courierId} onClick={() => toggleSuspend(courier)}>
                    {courier.status === "ACTIVE" ? "Suspender" : "Reativar"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
