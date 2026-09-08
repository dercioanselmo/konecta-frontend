"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CourierBaseLocationMap } from "@/components/merchant/CourierBaseLocationMap";
import { getShop } from "@/lib/stores/client";
import { getShopCourier, setCourierStatus, rejectCourier } from "@/lib/courier/client";
import { ClientApiError } from "@/lib/auth/client";
import {
  ASSOCIATION_STATUS_LABELS,
  TRANSPORT_LABELS,
  DOCUMENT_TYPE_LABELS,
  type ShopCourierDetail,
} from "@/lib/courier/types";
import type { Shop } from "@/lib/stores/types";

interface CourierDetailViewProps {
  shopId: string;
  courierId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

const TONE = { PENDING_STORE_APPROVAL: "warning", ACTIVE: "success", SUSPENDED: "neutral" } as const;

export function CourierDetailView({
  shopId,
  courierId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: CourierDetailViewProps) {
  const [courier, setCourier] = useState<ShopCourierDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [detail, shopDetail] = await Promise.all([getShopCourier(shopId, courierId), getShop(shopId)]);
      setCourier(detail);
      setShop(shopDetail);
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar o entregador.");
    } finally {
      setLoading(false);
    }
  }, [shopId, courierId]);

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

  const approve = async () => {
    setActionError(null);
    setBusy(true);
    try {
      const updated = await setCourierStatus(shopId, courierId, "ACTIVE");
      setCourier((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível aprovar o entregador.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSuspend = async () => {
    if (!courier) return;
    setActionError(null);
    setBusy(true);
    try {
      const updated = await setCourierStatus(shopId, courierId, courier.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      setCourier((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar o entregador.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setActionError(null);
    setBusy(true);
    try {
      await rejectCourier(shopId, courierId);
      setCourier((prev) => (prev ? { ...prev, status: "SUSPENDED" } : prev));
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível rejeitar o entregador.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <Link href={`${basePath}/${shopId}/couriers`} className="text-sm text-muted hover:underline">
        ← Entregadores
      </Link>

      {loading ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : loadError || !courier ? (
        <p className="text-sm text-red-500">{loadError ?? "Entregador não encontrado."}</p>
      ) : (
        <>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
            {courier.photoUrl ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                <Image src={courier.photoUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />
              </div>
            ) : null}
            <div>
              <p className="text-lg font-semibold text-foreground">{courier.courierName}</p>
              <p className="text-sm text-muted">
                {courier.courierPhone} · {TRANSPORT_LABELS[courier.transportType]}
                {courier.plateNumber ? ` (${courier.plateNumber})` : ""}
              </p>
              <p className="text-sm text-muted">{courier.distanceKm.toFixed(1)} km da loja</p>
              {courier.baseAddress ? <p className="text-sm text-muted">Base: {courier.baseAddress}{courier.baseNeighborhood ? `, ${courier.baseNeighborhood}` : ""}{courier.baseCity ? `, ${courier.baseCity}` : ""}</p> : null}
            </div>
            <Badge tone={TONE[courier.status]}>{ASSOCIATION_STATUS_LABELS[courier.status]}</Badge>
          </div>

          {shop?.latitude != null && shop.longitude != null && courier.baseLatitude != null && courier.baseLongitude != null ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Localização</h2>
                <p className="text-sm text-muted">Loja e base do entregador · {courier.distanceKm.toFixed(1)} km</p>
              </div>
              <CourierBaseLocationMap
                shop={{ latitude: shop.latitude, longitude: shop.longitude }}
                courier={{ latitude: courier.baseLatitude, longitude: courier.baseLongitude }}
              />
              {!courier.baseAddress ? <p className="text-sm text-muted">Endereço da base não disponível.</p> : null}
            </div>
          ) : null}

          {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

          <div className="flex gap-2">
            {courier.status === "PENDING_STORE_APPROVAL" ? (
              <>
                <Button type="button" className="w-auto px-5" loading={busy} onClick={approve}>
                  Aprovar
                </Button>
                <Button type="button" variant="secondary" className="w-auto px-5 text-red-600" loading={busy} onClick={reject}>
                  Rejeitar
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" className="w-auto px-5" loading={busy} onClick={toggleSuspend}>
                {courier.status === "ACTIVE" ? "Suspender" : "Reativar"}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-base font-semibold text-foreground">Documentos</h2>
            {courier.documents.length === 0 ? (
              <p className="text-sm text-muted">Sem documentos carregados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {courier.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-0.5 rounded-xl border border-border bg-background p-3 hover:bg-surface-hover"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {DOCUMENT_TYPE_LABELS[doc.type]} · {doc.number}
                    </p>
                    <p className="text-xs text-muted">
                      Emitido {doc.issueDate} em {doc.issuePlace} · Válido até {doc.expiryDate}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
