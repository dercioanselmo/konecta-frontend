import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { ApiError } from "@/lib/auth/types";
import type { Category, NearbyShop, PageResponse } from "@/lib/stores/types";

export default async function CategoryShopsPage({ params }: PageProps<"/categories/[categoryId]">) {
  const { categoryId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/categories/${categoryId}/access`);
  if (user.latitude == null || user.longitude == null) redirect(`/categories/${categoryId}/set-location`);

  let category: Category | undefined;
  try {
    const categories = await storesApiFetch<Category[]>("/api/v1/meta/categories");
    category = categories.find((c) => c.id === categoryId);
  } catch {
    category = undefined;
  }

  let shops: NearbyShop[] = [];
  let loadError: string | null = null;
  try {
    const result = await storesApiFetch<PageResponse<NearbyShop>>(
      `/api/v1/shops?categoryId=${categoryId}&lat=${user.latitude}&lng=${user.longitude}&page=0&size=50`,
    );
    shops = result.content;
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Não foi possível carregar as lojas.";
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <Link href="/home" className="text-sm text-muted hover:underline">
        ← Categorias
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-foreground">{category?.name ?? "Lojas"}</h1>
      <p className="text-sm text-muted">Ordenadas pelas mais próximas de si.</p>

      <main className="mt-6 flex-1">
        {loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : shops.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há lojas nesta categoria perto de si.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {shops.map((s) => (
              <Link
                key={s.id}
                href={`/stores/${s.id}`}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:bg-surface-hover"
              >
                <div className="relative aspect-square w-full bg-background">
                  {s.logoUrl || s.coverUrl ? (
                    <Image
                      src={s.logoUrl ?? s.coverUrl!}
                      alt={s.name}
                      fill
                      sizes="140px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                      Sem foto
                    </div>
                  )}
                  <span
                    className={`absolute right-1 top-1 h-2 w-2 rounded-full ${s.isOpen ? "bg-brand-green" : "bg-muted"}`}
                    title={s.isOpen ? "Aberta" : "Fechada"}
                  />
                </div>
                <div className="flex flex-col gap-0.5 p-2">
                  <p className="truncate text-xs font-semibold text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted">{s.distanceKm.toFixed(1)} km</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
