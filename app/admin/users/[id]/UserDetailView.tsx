"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { editUserSchema, type EditUserFormValues } from "@/lib/admin/validation";
import {
  getUser,
  updateUser,
  setUserRole,
  setUserEnabled,
  approveUser,
  rejectUser,
} from "@/lib/admin/client";
import { ROLE_LABELS, STATUS_LABELS, ASSIGNABLE_ROLES } from "@/lib/admin/roleLabels";
import { ClientApiError, fetchNeighborhoods } from "@/lib/auth/client";
import type { AdminUser, UserStatus } from "@/lib/admin/types";
import type { Neighborhood, Role } from "@/lib/auth/types";

function statusTone(status: UserStatus) {
  if (status === "PENDING") return "warning" as const;
  if (status === "REJECTED") return "danger" as const;
  return "success" as const;
}

export function UserDetailView({ id }: { id: string }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [nextRole, setNextRole] = useState<Role | "">("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({ resolver: zodResolver(editUserSchema) });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const u = await getUser(id);
      setUser(u);
      setNextRole(u.role);
      reset({
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        address: u.address,
        city: "Maputo",
        neighborhood: u.neighborhood,
      });
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar o utilizador.");
    }
  }, [id, reset]);

  useEffect(() => {
    // Deferred to a microtask so load()'s leading setState calls don't run
    // synchronously inside the effect body.
    queueMicrotask(() => {
      load();
    });
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
  }, [load]);

  const onSubmit = async (values: EditUserFormValues) => {
    setActionError(null);
    try {
      const updated = await updateUser(id, values);
      setUser(updated);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível guardar as alterações.");
    }
  };

  const runAction = async (action: () => Promise<AdminUser>) => {
    setActionError(null);
    setActionBusy(true);
    try {
      const updated = await action();
      setUser(updated);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setActionBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/admin/users" className="text-sm text-muted hover:underline">
          ← Utilizadores
        </Link>
        <p className="text-sm text-red-500">{loadError}</p>
      </div>
    );
  }

  if (!user) {
    return <p className="text-sm text-muted">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/users" className="text-sm text-muted hover:underline">
          ← Utilizadores
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {user.firstName} {user.lastName}
          </h1>
          <Badge tone={statusTone(user.status)}>{STATUS_LABELS[user.status]}</Badge>
          <Badge tone="neutral">{ROLE_LABELS[user.role]}</Badge>
          {!user.enabled ? <Badge tone="danger">Desativada</Badge> : null}
        </div>
        <p className="text-sm text-muted">{user.email}</p>
      </div>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

      {user.status === "PENDING" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4">
          <p className="flex-1 text-sm text-foreground">
            Pedido de acesso pendente{user.requestedRole ? ` como ${ROLE_LABELS[user.requestedRole]}` : ""}.
          </p>
          <Button
            type="button"
            disabled={actionBusy}
            onClick={() => runAction(() => approveUser(id))}
            className="w-auto px-5"
          >
            Aprovar
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={actionBusy}
            onClick={() => runAction(() => rejectUser(id))}
            className="w-auto px-5"
          >
            Rejeitar
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="w-56">
          <Select label="Função" value={nextRole} onChange={(e) => setNextRole(e.target.value as Role)}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-auto px-5"
          disabled={actionBusy || !nextRole || nextRole === user.role}
          onClick={() => nextRole && runAction(() => setUserRole(id, nextRole))}
        >
          Alterar função
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          variant="secondary"
          className="w-auto px-5"
          disabled={actionBusy}
          onClick={() => runAction(() => setUserEnabled(id, !user.enabled))}
        >
          {user.enabled ? "Desativar conta" : "Ativar conta"}
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-lg flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Dados do perfil</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Primeiro nome" error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Último nome" error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <Input label="Telefone" type="tel" error={errors.phone?.message} {...register("phone")} />
        <Input label="Endereço" error={errors.address?.message} {...register("address")} />
        <Input label="Cidade" value="Maputo" disabled {...register("city")} />
        <Select label="Bairro" error={errors.neighborhood?.message} {...register("neighborhood")}>
          {neighborhoods.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </Select>
        <Button type="submit" loading={isSubmitting} className="mt-2 w-auto px-6">
          Guardar alterações
        </Button>
      </form>
    </div>
  );
}
