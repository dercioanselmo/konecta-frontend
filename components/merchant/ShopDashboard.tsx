import { ShopNav } from "@/components/merchant/ShopNav";
import { Badge } from "@/components/ui/Badge";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { getValidAccessToken } from "@/lib/auth/session";
import { ApiError } from "@/lib/auth/types";
import type { DashboardSummary, Shop } from "@/lib/stores/types";

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

  if (accessToken) {
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      [shop, summary] = await Promise.all([
        storesApiFetch<Shop>(`/api/v1/merchant/shops/${shopId}`, { headers }),
        storesApiFetch<DashboardSummary>(`/api/v1/merchant/shops/${shopId}/dashboard/summary`, { headers }),
      ]);
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
        {!shop.activationReady ? (
          <span className="text-xs text-muted">Complete os dados fiscais em Definições para ativar a loja.</span>
        ) : null}
      </div>
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
      <p className="text-xs text-muted">
        Vendas, encomendas e recebimentos chegam numa próxima fase, assim que os respetivos serviços estiverem disponíveis.
      </p>
    </div>
  );
}
