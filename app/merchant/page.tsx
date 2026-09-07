import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { ordersApiFetch } from "@/lib/orders/ordersApi";
import { getCurrentUser, getValidAccessToken } from "@/lib/auth/session";
import type { ShopSummary } from "@/lib/stores/types";
import type { MerchantOrdersListResponse } from "@/lib/orders/merchantTypes";

const DELAY_THRESHOLD_MS = 5 * 60 * 1000;

interface ShopOrderStats {
  activeCount: number;
  delayed: boolean;
}

/**
 * Active-order count + delay flag per shop, for the shop-picker cards.
 * Same "no dedicated counts endpoint yet" limitation as `ShopDashboard.tsx`
 * — capped to the first 200 active orders per shop rather than a true
 * total beyond that. A shop's fetch failing shouldn't take down the
 * whole picker, so it just shows no badge for that one shop.
 */
async function loadShopOrderStats(shopId: string, headers: HeadersInit): Promise<ShopOrderStats> {
  try {
    const page = await ordersApiFetch<MerchantOrdersListResponse>(
      `/api/v1/merchant/shops/${shopId}/orders?tab=ACTIVE&size=200`,
      { headers },
    );
    const now = Date.now();
    const delayed = page.content.some((order) => {
      const since = new Date(order.statusUpdatedAt ?? order.createdAt).getTime();
      return now - since > DELAY_THRESHOLD_MS;
    });
    return { activeCount: page.totalElements, delayed };
  } catch {
    return { activeCount: 0, delayed: false };
  }
}

export default async function MerchantShopsPage() {
  // MERCHANT_STAFF only ever has the one shop they were assigned to — skip
  // the picker and land them straight there. This route is unambiguously
  // "/merchant" (it's this file), so no need to detect the current path
  // any other way. MerchantShell already guarantees `shopId` is set for
  // any MERCHANT_STAFF that gets this far.
  const user = await getCurrentUser();
  if (user?.role === "MERCHANT_STAFF" && user.shopId) {
    redirect(`/merchant/shops/${user.shopId}`);
  }

  const accessToken = await getValidAccessToken();

  let shops: ShopSummary[] = [];
  let loadError = false;
  let orderStats: Record<string, ShopOrderStats> = {};
  if (accessToken) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    try {
      shops = await storesApiFetch<ShopSummary[]>("/api/v1/merchant/shops", { headers });
    } catch {
      loadError = true;
    }
    if (shops.length > 0) {
      const stats = await Promise.all(shops.map((s) => loadShopOrderStats(s.id, headers)));
      orderStats = Object.fromEntries(shops.map((s, i) => [s.id, stats[i]]));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">As suas lojas</h1>
          <p className="text-sm text-muted">Escolha uma loja para gerir, ou crie uma nova.</p>
        </div>
        <Link
          href="/merchant/shops/new"
          className="flex h-10 items-center justify-center rounded-xl bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          Nova loja
        </Link>
      </div>

      {loadError ? <p className="text-sm text-red-500">Não foi possível carregar as suas lojas.</p> : null}

      {!loadError && shops.length === 0 ? (
        <p className="text-sm text-muted">Ainda não tem nenhuma loja. Crie a primeira para começar.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shops.map((shop) => (
          <Link
            key={shop.id}
            href={`/merchant/shops/${shop.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {shop.logoUrl ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                    <Image src={shop.logoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                  </div>
                ) : null}
                <p className="text-base font-semibold text-foreground">{shop.name}</p>
              </div>
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${shop.isOpen ? "bg-brand-green" : "bg-muted"}`}
                title={shop.isOpen ? "Aberta" : "Fechada"}
              />
            </div>
            <p className="text-sm text-muted">{shop.isOpen ? "Aberta agora" : "Fechada agora"}</p>
            {shop.categories && shop.categories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {shop.categories.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            ) : null}
            {shop.lowStockCount > 0 ? (
              <span className="w-fit rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-semibold text-brand-orange">
                {shop.lowStockCount} produto{shop.lowStockCount === 1 ? "" : "s"} com stock baixo
              </span>
            ) : null}
            {orderStats[shop.id] && orderStats[shop.id].activeCount > 0 ? (
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  orderStats[shop.id].delayed ? "bg-brand-orange/15 text-brand-orange" : "bg-brand-green/15 text-brand-green"
                }`}
              >
                {orderStats[shop.id].activeCount} encomenda{orderStats[shop.id].activeCount === 1 ? "" : "s"} ativa
                {orderStats[shop.id].activeCount === 1 ? "" : "s"}
                {orderStats[shop.id].delayed ? " · atrasada" : ""}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
