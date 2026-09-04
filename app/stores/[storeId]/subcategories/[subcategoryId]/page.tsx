import Image from "next/image";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { ApiError } from "@/lib/auth/types";
import type { PageResponse, PublicProduct, PublicShop, Subcategory } from "@/lib/stores/types";

export default async function StoreSubcategoryProductsPage({
  params,
}: PageProps<"/stores/[storeId]/subcategories/[subcategoryId]">) {
  const { storeId, subcategoryId } = await params;

  let shop: PublicShop | null = null;
  let subcategory: Subcategory | undefined;
  let products: PublicProduct[] = [];
  let loadError: string | null = null;
  try {
    shop = await storesApiFetch<PublicShop>(`/api/v1/shops/${storeId}`);
    const subLists = await Promise.all(
      shop.categories.map((c) => storesApiFetch<Subcategory[]>(`/api/v1/meta/categories/${c.id}/subcategories`)),
    );
    subcategory = subLists.flat().find((sc) => sc.id === subcategoryId);

    const result = await storesApiFetch<PageResponse<PublicProduct>>(
      `/api/v1/shops/${storeId}/products?subcategoryId=${subcategoryId}&page=0&size=50`,
    );
    products = result.content;
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Não foi possível carregar os produtos.";
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <CustomerHeader backHref={`/stores/${storeId}`} backLabel="← Categorias" />

      <h1 className="mt-4 text-2xl font-bold text-foreground">{subcategory?.name ?? "Produtos"}</h1>
      {shop ? <p className="text-sm text-muted">{shop.name}</p> : null}

      <main className="mt-6 flex-1">
        {loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há produtos nesta categoria.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="relative aspect-square w-full bg-background">
                  {p.photoUrl ? (
                    <Image src={p.photoUrl} alt={p.name} fill sizes="120px" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                      Sem foto
                    </div>
                  )}
                </div>
                <p className="truncate p-1.5 text-[11px] font-medium text-foreground">{p.name}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
