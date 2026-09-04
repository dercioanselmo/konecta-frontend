import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { SearchBar } from "@/components/customer/SearchBar";
import { ProductGrid } from "@/components/customer/ProductGrid";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { getCurrentUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/auth/types";
import type { PageResponse, PublicProduct, PublicShop, Subcategory } from "@/lib/stores/types";

export default async function StoreSubcategoryProductsPage({
  params,
}: PageProps<"/stores/[storeId]/subcategories/[subcategoryId]">) {
  const { storeId, subcategoryId } = await params;
  const user = await getCurrentUser();

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
      <CustomerHeader user={user} backHref={`/stores/${storeId}`} backLabel="← Categorias" />
      <div className="mt-3">
        <SearchBar />
      </div>

      <h1 className="mt-4 text-2xl font-bold text-foreground">{subcategory?.name ?? "Produtos"}</h1>
      {shop ? <p className="text-sm text-muted">{shop.name}</p> : null}

      <main className="mt-6 flex-1">
        {loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : (
          <ProductGrid
            products={products}
            shopId={storeId}
            isLoggedIn={!!user}
            loginNext={`/stores/${storeId}/subcategories/${subcategoryId}`}
          />
        )}
      </main>
    </div>
  );
}
