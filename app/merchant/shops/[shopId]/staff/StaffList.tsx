"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { listStaff, setStaffEnabled } from "@/lib/merchant/client";
import { ClientApiError } from "@/lib/auth/client";
import type { UserProfile } from "@/lib/auth/types";

export function StaffList({ shopId, isReadOnly }: { shopId: string; isReadOnly?: boolean }) {
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const page = await listStaff({ shopId, query: query || undefined });
      setStaff(page.content);
    } catch (err) {
      setLoadError(
        err instanceof ClientApiError ? err.message : "Não foi possível carregar os funcionários.",
      );
    }
  }, [shopId, query]);

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

  const toggleEnabled = async (member: UserProfile) => {
    setActionError(null);
    setBusy(member.id);
    try {
      const updated = await setStaffEnabled(member.id, !member.enabled);
      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setActionError(
        err instanceof ClientApiError ? err.message : "Não foi possível atualizar o funcionário.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">Funcionários</h2>
        {!isReadOnly ? (
          <Link
            href={`/merchant/shops/${shopId}/staff/new`}
            className="flex h-10 items-center justify-center rounded-xl bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Novo funcionário
          </Link>
        ) : null}
      </div>

      <input
        type="search"
        placeholder="Pesquisar por nome ou email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-12 w-full max-w-sm rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/60"
      />

      {loadError ? <p className="text-sm text-red-500">{loadError}</p> : null}
      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

      {staff.length === 0 && !loadError ? (
        <p className="text-sm text-muted">Nenhum funcionário encontrado.</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {staff.map((member) => (
          <div
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold text-foreground">
                {member.firstName} {member.lastName}
              </p>
              <p className="text-sm text-muted">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {!member.enabled ? <Badge tone="danger">Desativado</Badge> : null}
              {member.mustChangePassword ? (
                <Badge tone="warning">Deve alterar senha</Badge>
              ) : null}
              <Link
                href={`/merchant/shops/${shopId}/staff/${member.id}`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
              >
                {isReadOnly ? "Ver" : "Editar"}
              </Link>
              {!isReadOnly ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-auto px-3 text-sm"
                  disabled={busy === member.id}
                  loading={busy === member.id}
                  onClick={() => toggleEnabled(member)}
                >
                  {member.enabled ? "Desativar" : "Ativar"}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
