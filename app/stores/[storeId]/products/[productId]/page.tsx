import Image from "next/image";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { getCurrentUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/auth/types";
import type { PublicProductDetail } from "@/lib/stores/types";
import { ProductDetailActions } from "./ProductDetailActions";

export default async function ProductDetailPage({
  params,
}: PageProps<"/stores/[storeId]/products/[productId]">) {
  const { storeId, productId } = await params;
  const user = await getCurrentUser();

  let product: PublicProductDetail | null = null;
  let loadError: string | null = null;
  try {
    product = await storesApiFetch<PublicProductDetail>(`/api/v1/shops/${storeId}/products/${productId}`);
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Não foi possível carregar o produto.";
  }

  const backHref = product?.subcategoryId
    ? `/stores/${storeId}/subcategories/${product.subcategoryId}`
    : `/stores/${storeId}`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
      <CustomerHeader user={user} backHref={backHref} backLabel="← Produtos" />

      {loadError || !product ? (
        <p className="mt-6 text-sm text-red-500">{loadError ?? "Produto não encontrado."}</p>
      ) : (
        // `flex-1` here lets this block claim the leftover space below the
        // header on a tall viewport, so `justify-center` can center the
        // photo+details as a group; `items-center` stops the default flex
        // `align-items: stretch` from doing what it did before — forcing
        // the image column to stretch to match (or fill) the container's
        // full height instead of keeping its own natural, square size.
        <main className="mt-6 flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
          {/* Same square ratio as the browsing grid's tiles — just much
              bigger, since this is the one big hero photo instead of a
              small list thumbnail. Built with the old padding-percentage
              technique rather than the `aspect-square` utility: as a flex
              item inside a `flex-direction: column` container (the mobile
              layout, before `sm:flex-row` kicks in), `aspect-ratio` doesn't
              reliably determine a flex item's main-axis (height) size
              across browsers — the box stretched taller than it was wide.
              A zero-height spacer sized by `padding-top` percentage is
              immune to that: it only depends on percentage-of-width, which
              is universally supported regardless of any flex sizing quirk. */}
          <div className="relative w-full shrink-0 sm:w-104">
            <div className="pt-[100%]" />
            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-surface">
              {product.photoUrl ? (
                <Image src={product.photoUrl} alt={product.name} fill sizes="(min-width: 640px) 416px, 100vw" className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted">Sem foto</div>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{product.name}</h1>
              {product.categoryName || product.subcategoryName ? (
                <p className="mt-1 text-sm text-muted">
                  {[product.categoryName, product.subcategoryName].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            <p className="text-xl font-bold text-foreground">
              {product.price != null ? `${product.price.toFixed(2)} MT` : "Preço indisponível"}
            </p>

            <p className="whitespace-pre-line text-sm text-muted">{product.description}</p>

            <ProductDetailActions
              productId={product.id}
              shopId={storeId}
              inStock={product.inStock}
              isLoggedIn={!!user}
              loginNext={`/stores/${storeId}/products/${productId}`}
            />
          </div>
        </main>
      )}
    </div>
  );
}
