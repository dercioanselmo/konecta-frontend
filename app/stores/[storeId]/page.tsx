import Image from "next/image";
import Link from "next/link";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { SearchBar } from "@/components/customer/SearchBar";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { getCurrentUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/auth/types";
import type { PublicShop, Subcategory } from "@/lib/stores/types";

export default async function StorePage({ params }: PageProps<"/stores/[storeId]">) {
  const { storeId } = await params;
  const user = await getCurrentUser();

  let shop: PublicShop | null = null;
  let subcategories: Subcategory[] = [];
  let loadError: string | null = null;
  try {
    shop = await storesApiFetch<PublicShop>(`/api/v1/shops/${storeId}`);
    const lists = await Promise.all(
      shop.categories.map((c) =>
        storesApiFetch<Subcategory[]>(`/api/v1/meta/categories/${c.id}/subcategories`),
      ),
    );
    subcategories = lists.flat();
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Não foi possível carregar a loja.";
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <CustomerHeader user={user} backHref="/home" backLabel="← Categorias" />
      <div className="mt-3">
        <SearchBar />
      </div>

      {loadError || !shop ? (
        <p className="mt-6 text-sm text-red-500">{loadError ?? "Loja não encontrada."}</p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3">
            {shop.logoUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                <Image src={shop.logoUrl} alt="" fill sizes="56px" className="object-cover" unoptimized />
              </div>
            ) : null}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{shop.name}</h1>
              <p className="text-sm text-muted">{shop.isOpen ? "Aberta agora" : "Fechada agora"}</p>
            </div>
          </div>

          <main className="mt-6 flex-1">
            <h2 className="mb-4 text-lg font-bold text-foreground">Categorias de produtos</h2>
            {subcategories.length === 0 ? (
              <p className="text-sm text-muted">Ainda não há produtos organizados por categoria nesta loja.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6">
                {subcategories.map((sc) => (
                  <Link
                    key={sc.id}
                    href={`/stores/${storeId}/subcategories/${sc.id}`}
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:bg-surface-hover"
                  >
                    <div className="relative aspect-square w-full bg-background">
                      {sc.imageUrl ? (
                        <Image src={sc.imageUrl} alt={sc.name} fill sizes="120px" className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <p className="truncate p-1.5 text-[11px] font-medium text-foreground">{sc.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
