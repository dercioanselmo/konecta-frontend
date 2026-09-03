"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { listAllShops } from "@/lib/stores/client";
import { ClientApiError } from "@/lib/auth/client";
import type { AdminShopSummary, ShopStatus } from "@/lib/stores/types";

const PAGE_SIZE = 20;
const STATUSES: ShopStatus[] = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "SUSPENDED", "CLOSED"];

function statusTone(status: ShopStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "DRAFT" || status === "PENDING_REVIEW") return "warning" as const;
  return "danger" as const;
}

export default function AdminShopsPage() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ShopStatus | "">("");
  const [page, setPage] = useState(0);

  const [shops, setShops] = useState<AdminShopSummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAllShops({
        query: query || undefined,
        status: status || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      });
      setShops(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Não foi possível carregar as lojas.");
    } finally {
      setLoading(false);
    }
  }, [query, status, page]);

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

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-foreground">Lojas</h1>

      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Pesquisar"
            placeholder="Nome da loja"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>
        <Select
          label="Estado"
          value={status}
          onChange={(e) => {
            setPage(0);
            setStatus(e.target.value as ShopStatus | "");
          }}
        >
          <option value="">Todos</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Button type="submit" className="w-auto px-6">
          Pesquisar
        </Button>
      </form>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Loja</th>
              <th className="px-4 py-3 font-medium">Proprietário</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Aberta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  A carregar…
                </td>
              </tr>
            ) : shops.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Nenhuma loja encontrada.
                </td>
              </tr>
            ) : (
              shops.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/shops/${s.id}`} className="font-medium text-foreground hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {s.ownerName} <span className="text-xs">({s.ownerEmail})</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={s.isOpen ? "success" : "neutral"}>{s.isOpen ? "Aberta" : "Fechada"}</Badge>
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
