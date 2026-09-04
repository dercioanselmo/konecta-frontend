import Image from "next/image";
import Link from "next/link";
import { storesApiFetch } from "@/lib/stores/storesApi";
import type { Category } from "@/lib/stores/types";

export default async function CategoryPage({ params }: PageProps<"/categories/[categoryId]">) {
  const { categoryId } = await params;

  let category: Category | undefined;
  try {
    const categories = await storesApiFetch<Category[]>("/api/v1/meta/categories");
    category = categories.find((c) => c.id === categoryId);
  } catch {
    category = undefined;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <Link href="/home" className="text-sm text-muted hover:underline">
        ← Categorias
      </Link>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {category?.imageUrl ? (
          <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-border">
            <Image src={category.imageUrl} alt={category.name} fill sizes="112px" className="object-cover" unoptimized />
          </div>
        ) : null}
        <h1 className="text-xl font-bold text-foreground">{category?.name ?? "Categoria"}</h1>
        <p className="max-w-xs text-sm text-muted">
          As lojas e produtos desta categoria chegam numa próxima fase. Volte em breve.
        </p>
      </main>
    </div>
  );
}
