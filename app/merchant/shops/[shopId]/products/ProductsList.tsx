"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getShop, listProducts, setProductActive } from "@/lib/stores/client";
import { ClientApiError } from "@/lib/auth/client";
import type { Product } from "@/lib/stores/types";

const PAGE_SIZE = 20;

export function ProductsList({ shopId, isReadOnly }: { shopId: string; isReadOnly?: boolean }) {
  const [shopName, setShopName] = useState("Loja");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  useEffect(() => {
    getShop(shopId).then((s) => setShopName(s.name)).catch(() => {});
  }, [shopId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProducts(shopId, {
        query: query || undefined,
        lowStock: lowStockOnly || undefined,
        page,
        size: PAGE_SIZE,
        sort: "name,asc",
      });
      setProducts(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, [shopId, query, lowStockOnly, page]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setQuery(queryInput.trim());
  };

  const toggleActive = async (product: Product) => {
    setActionError(null);
    setPendingActionId(product.id);
    try {
      await setProductActive(shopId, product.id, !product.active);
      await load();
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <ShopNav shopId={shopId} shopName={shopName} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">Produtos</h2>
        {!isReadOnly ? (
          <Link
            href={`/merchant/shops/${shopId}/products/new`}
            className="flex h-10 items-center justify-center rounded-xl bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Novo produto
          </Link>
        ) : null}
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Pesquisar"
            placeholder="Nome do produto"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>
        <label className="flex h-12 items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setPage(0);
              setLowStockOnly(e.target.checked);
            }}
          />
          Apenas stock baixo
        </label>
        <Button type="submit" className="w-auto px-6">
          Pesquisar
        </Button>
      </form>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  A carregar…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/merchant/shops/${shopId}/products/${p.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.price.toFixed(2)} MT</td>
                  <td className="px-4 py-3">
                    <span className={p.lowStock ? "font-semibold text-brand-orange" : "text-foreground"}>
                      {p.stockQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                      {p.lowStock ? <Badge tone="warning">Stock baixo</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {!isReadOnly ? (
                        <button
                          type="button"
                          disabled={pendingActionId === p.id}
                          onClick={() => toggleActive(p)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-60"
                        >
                          {p.active ? "Desativar" : "Ativar"}
                        </button>
                      ) : null}
                      <Link
                        href={`/merchant/shops/${shopId}/products/${p.id}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground"
                      >
                        {isReadOnly ? "Ver" : "Editar"}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="secondary"
            className="w-auto px-4"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            className="w-auto px-4"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Seguinte
          </Button>
        </div>
      ) : null}
    </div>
  );
}
