import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { getCurrentUser } from "@/lib/auth/session";
import { storesApiFetch } from "@/lib/stores/storesApi";
import type { Category } from "@/lib/stores/types";

export default async function CategoryAccessPage({ params }: PageProps<"/categories/[categoryId]/access">) {
  const { categoryId } = await params;

  // This page is only for anonymous visitors — a logged-in user belongs on
  // the location prompt (if needed) or straight through to the shop list.
  const user = await getCurrentUser();
  if (user) {
    redirect(
      user.latitude != null && user.longitude != null
        ? `/categories/${categoryId}`
        : `/categories/${categoryId}/set-location`,
    );
  }

  let category: Category | undefined;
  try {
    const categories = await storesApiFetch<Category[]>("/api/v1/meta/categories");
    category = categories.find((c) => c.id === categoryId);
  } catch {
    category = undefined;
  }

  const next = `/categories/${categoryId}`;
  const nextParam = encodeURIComponent(next);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <CustomerHeader />

      <main className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        {category?.imageUrl ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-border">
            <Image src={category.imageUrl} alt={category.name} fill sizes="96px" className="object-cover" unoptimized />
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">
            Veja as lojas de {category?.name ?? "esta categoria"} mais perto de si
          </h1>
          <p className="max-w-xs text-sm text-muted">
            Crie a sua conta e defina a sua localização para mostrarmos primeiro as lojas mais próximas
            de si — é rápido e só precisa de o fazer uma vez.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href={`/register?next=${nextParam}`}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Criar conta
          </Link>
          <Link
            href={`/login?next=${nextParam}`}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            Já tenho conta — Entrar
          </Link>
        </div>
      </main>
    </div>
  );
}
