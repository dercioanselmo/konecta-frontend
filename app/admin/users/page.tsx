"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/admin/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { listUsers, approveUser, rejectUser, setUserEnabled } from "@/lib/admin/client";
import { ROLE_LABELS, STATUS_LABELS, ASSIGNABLE_ROLES } from "@/lib/admin/roleLabels";
import { ClientApiError } from "@/lib/auth/client";
import type { AdminUser, UserStatus } from "@/lib/admin/types";
import type { Role } from "@/lib/auth/types";

const PAGE_SIZE = 20;

function statusTone(status: UserStatus) {
  if (status === "PENDING") return "warning" as const;
  if (status === "REJECTED") return "danger" as const;
  return "success" as const;
}

export default function AdminUsersPage() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(0);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        query: query || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      });
      setUsers(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Não foi possível carregar os utilizadores.");
    } finally {
      setLoading(false);
    }
  }, [query, role, status, page]);

  useEffect(() => {
    // Deferred to a microtask so the fetch's leading setState calls don't
    // run synchronously inside the effect body.
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setQuery(queryInput.trim());
  };

  const runAction = async (id: string, action: () => Promise<AdminUser>) => {
    setActionError(null);
    setPendingActionId(id);
    try {
      await action();
      await load();
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Utilizadores</h1>
        <Link
          href="/admin/users/new"
          className="flex h-10 items-center justify-center rounded-xl bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          Novo utilizador
        </Link>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Pesquisar"
            placeholder="Nome ou email"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            label="Função"
            value={role}
            onChange={(e) => {
              setPage(0);
              setRole(e.target.value as Role | "");
            }}
          >
            <option value="">Todas</option>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            label="Estado"
            value={status}
            onChange={(e) => {
              setPage(0);
              setStatus(e.target.value as UserStatus | "");
            }}
          >
            <option value="">Todos</option>
            {(Object.keys(STATUS_LABELS) as UserStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" className="w-auto px-6">
          Pesquisar
        </Button>
      </form>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Função</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Nenhum utilizador encontrado.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-foreground hover:underline">
                      {u.firstName} {u.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">
                      {ROLE_LABELS[u.role]}
                      {u.status === "PENDING" && u.requestedRole ? ` → ${ROLE_LABELS[u.requestedRole]}` : ""}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={statusTone(u.status)}>{STATUS_LABELS[u.status]}</Badge>
                      {!u.enabled ? <Badge tone="danger">Desativada</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {u.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            disabled={pendingActionId === u.id}
                            onClick={() => runAction(u.id, () => approveUser(u.id))}
                            className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            disabled={pendingActionId === u.id}
                            onClick={() => runAction(u.id, () => rejectUser(u.id))}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-500 disabled:opacity-60"
                          >
                            Rejeitar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={pendingActionId === u.id}
                          onClick={() => runAction(u.id, () => setUserEnabled(u.id, !u.enabled))}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-60"
                        >
                          {u.enabled ? "Desativar" : "Ativar"}
                        </button>
                      )}
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground"
                      >
                        Editar
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
