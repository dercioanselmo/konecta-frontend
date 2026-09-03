import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { getCurrentUser, getValidAccessToken } from "@/lib/auth/session";
import type { ShopSummary } from "@/lib/stores/types";

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
  if (accessToken) {
    try {
      shops = await storesApiFetch<ShopSummary[]>("/api/v1/merchant/shops", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      loadError = true;
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
            {shop.lowStockCount > 0 ? (
              <span className="w-fit rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-semibold text-brand-orange">
                {shop.lowStockCount} produto{shop.lowStockCount === 1 ? "" : "s"} com stock baixo
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
