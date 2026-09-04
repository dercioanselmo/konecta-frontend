"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { listAdminCategories } from "@/lib/stores/client";
import { ClientApiError } from "@/lib/auth/client";
import type { Category } from "@/lib/stores/types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAdminCategories();
      setCategories(result.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Não foi possível carregar as categorias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
        <Link
          href="/admin/categories/new"
          className="flex h-10 items-center justify-center rounded-xl bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          Nova categoria
        </Link>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma categoria encontrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/admin/categories/${c.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:bg-surface-hover"
            >
              <div className="relative aspect-square w-full bg-background">
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt={c.name} fill sizes="200px" className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted">Sem imagem</div>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                <div className="flex items-center gap-1.5">
                  <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Ativa" : "Inativa"}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
