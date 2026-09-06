import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Badge } from "@/components/ui/Badge";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { ordersApiFetch } from "@/lib/orders/ordersApi";
import { getValidAccessToken } from "@/lib/auth/session";
import { ApiError } from "@/lib/auth/types";
import type { DashboardSummary, Shop } from "@/lib/stores/types";
import type { MerchantOrdersListResponse } from "@/lib/orders/merchantTypes";

const NOT_YET_ACCEPTED = new Set(["PAID", "PENDING_STORE_OPEN"]);
const ACCEPTED_IN_PREP = new Set(["STORE_CONFIRMED", "PREPARING"]);
const READY_OR_EN_ROUTE = new Set(["READY_FOR_PICKUP", "COURIER_ASSIGNED", "PICKED_UP", "IN_TRANSIT"]);

interface ShopDashboardProps {
  shopId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

export async function ShopDashboard({
  shopId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: ShopDashboardProps) {
  const accessToken = await getValidAccessToken();

  let shop: Shop | null = null;
  let summary: DashboardSummary | null = null;
  let error: string | null = null;
  let notYetAccepted = 0;
  let acceptedInPrep = 0;
  let readyOrEnRoute = 0;
  let ordersLoaded = false;

  if (accessToken) {
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      [shop, summary] = await Promise.all([
        storesApiFetch<Shop>(`/api/v1/merchant/shops/${shopId}`, { headers }),
        storesApiFetch<DashboardSummary>(`/api/v1/merchant/shops/${shopId}/dashboard/summary`, { headers }),
      ]);

      // Bucket counts computed client-side over the active-orders page —
      // there's no dedicated counts endpoint yet (see
      // API_REFERENCE_MERCHANT_ORDERS.md's follow-up ask), so this is
      // capped to the first 200 active orders rather than a true total.
      try {
        const activeOrders = await ordersApiFetch<MerchantOrdersListResponse>(
          `/api/v1/merchant/shops/${shopId}/orders?tab=ACTIVE&size=200`,
          { headers },
        );
        for (const order of activeOrders.content) {
          if (NOT_YET_ACCEPTED.has(order.status)) notYetAccepted++;
          else if (ACCEPTED_IN_PREP.has(order.status)) acceptedInPrep++;
          else if (READY_OR_EN_ROUTE.has(order.status)) readyOrEnRoute++;
        }
        ordersLoaded = true;
      } catch {
        // Orders service hiccup shouldn't take down the whole dashboard —
        // the boxes just don't render (below) rather than show a
        // misleading "0" when the real count is unknown.
      }
    } catch (err) {
      error = err instanceof ApiError ? err.message : "Não foi possível carregar a loja.";
    }
  }

  if (error || !shop) {
    return (
      <div className="flex flex-col gap-3">
        <ShopNav shopId={shopId} shopName="Loja" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />
        <p className="text-sm text-red-500">{error ?? "Loja não encontrada."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName={shop.name} hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={shop.status === "ACTIVE" ? "success" : shop.status === "DRAFT" ? "warning" : "danger"}>
          {shop.status}
        </Badge>
        <Badge tone={shop.isOpen ? "success" : "neutral"}>{shop.isOpen ? "Aberta" : "Fechada"}</Badge>
        {shop.categories.map((c) => (
          <Badge key={c.id} tone="neutral">
            {c.name}
          </Badge>
        ))}
        {!shop.activationReady ? (
          <span className="text-xs text-muted">Complete os dados fiscais em Definições para ativar a loja.</span>
        ) : null}
      </div>
      {ordersLoaded ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href={`${basePath}/${shopId}/orders`} className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover">
            <p className="text-sm text-muted">Recebidas (por aceitar)</p>
            <p className="text-2xl font-bold text-orange-600">{notYetAccepted}</p>
          </Link>
          <Link href={`${basePath}/${shopId}/orders`} className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover">
            <p className="text-sm text-muted">Aceites (em preparação)</p>
            <p className="text-2xl font-bold text-foreground">{acceptedInPrep}</p>
          </Link>
          <Link href={`${basePath}/${shopId}/orders`} className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover">
            <p className="text-sm text-muted">Prontas / em entrega</p>
            <p className="text-2xl font-bold text-foreground">{readyOrEnRoute}</p>
          </Link>
        </div>
      ) : null}
      {summary ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Produtos</p>
            <p className="text-2xl font-bold text-foreground">{summary.productCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Produtos ativos</p>
            <p className="text-2xl font-bold text-foreground">{summary.activeProductCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Stock baixo</p>
            <p className="text-2xl font-bold text-brand-orange">{summary.lowStockCount}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
