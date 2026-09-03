import Link from "next/link";
import { authApiFetch } from "@/lib/auth/authApi";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { getCurrentUser, getValidAccessToken } from "@/lib/auth/session";
import type { AdminUser, PageResponse } from "@/lib/admin/types";
import type { AdminShopSummary } from "@/lib/stores/types";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const accessToken = await getValidAccessToken();

  let pendingCount: number | null = null;
  let shopCount: number | null = null;
  if (accessToken) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    try {
      const page = await authApiFetch<PageResponse<AdminUser>>(
        "/api/v1/admin/users?status=PENDING&page=0&size=1",
        { headers },
      );
      pendingCount = page.totalElements;
    } catch {
      pendingCount = null;
    }
    try {
      const shops = await storesApiFetch<PageResponse<AdminShopSummary>>(
        "/api/v1/admin/shops?page=0&size=1",
        { headers },
      );
      shopCount = shops.totalElements;
    } catch {
      shopCount = null;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {user?.firstName}</h1>
        <p className="text-sm text-muted">Painel de administração da KONECTA.</p>
      </div>

      <Link
        href="/admin/users"
        className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
      >
        <div>
          <p className="text-base font-semibold text-foreground">Utilizadores</p>
          <p className="text-sm text-muted">Criar, editar, aprovar e desativar contas.</p>
        </div>
        {pendingCount !== null && pendingCount > 0 ? (
          <span className="whitespace-nowrap rounded-full bg-brand-orange/15 px-3 py-1 text-sm font-semibold text-brand-orange">
            {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </Link>

      <Link
        href="/admin/shops"
        className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
      >
        <div>
          <p className="text-base font-semibold text-foreground">Lojas</p>
          <p className="text-sm text-muted">Ver e gerir qualquer loja da plataforma.</p>
        </div>
        {shopCount !== null ? (
          <span className="whitespace-nowrap rounded-full bg-brand-green/15 px-3 py-1 text-sm font-semibold text-brand-green">
            {shopCount} loja{shopCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
