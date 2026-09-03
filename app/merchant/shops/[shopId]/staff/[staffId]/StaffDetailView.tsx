"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getStaff, updateStaff, setStaffEnabled } from "@/lib/merchant/client";
import { fetchNeighborhoods, ClientApiError } from "@/lib/auth/client";
import { editProfileSchema, type EditProfileFormValues } from "@/lib/auth/validation";
import type { Neighborhood, UserProfile } from "@/lib/auth/types";

export function StaffDetailView({ shopId, staffId }: { shopId: string; staffId: string }) {
  const [member, setMember] = useState<UserProfile | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toggling, setToggling] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormValues>({ resolver: zodResolver(editProfileSchema) });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const s = await getStaff(staffId);
      setMember(s);
      reset({
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone ?? "",
        address: s.address ?? "",
        city: "Maputo",
        neighborhood: s.neighborhood ?? "",
      });
    } catch (err) {
      setLoadError(
        err instanceof ClientApiError ? err.message : "Não foi possível carregar o funcionário.",
      );
    }
  }, [staffId, reset]);

  useEffect(() => {
    queueMicrotask(() => { load(); });
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
  }, [load]);

  const onSubmit = async (values: EditProfileFormValues) => {
    setActionError(null);
    setSaveSuccess(false);
    try {
      const updated = await updateStaff(staffId, values);
      setMember(updated);
      setSaveSuccess(true);
    } catch (err) {
      setActionError(
        err instanceof ClientApiError
          ? (err.details?.join(" ") ?? err.message)
          : "Não foi possível guardar as alterações.",
      );
    }
  };

  const toggleEnabled = async () => {
    if (!member) return;
    setActionError(null);
    setToggling(true);
    try {
      const updated = await setStaffEnabled(staffId, !member.enabled);
      setMember(updated);
    } catch (err) {
      setActionError(
        err instanceof ClientApiError ? err.message : "Não foi possível atualizar o funcionário.",
      );
    } finally {
      setToggling(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <ShopNav shopId={shopId} shopName="" />
        <p className="text-sm text-red-500">{loadError}</p>
      </div>
    );
  }

  if (!member) return <p className="text-sm text-muted">A carregar…</p>;

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {member.firstName} {member.lastName}
          </h2>
          <p className="text-sm text-muted">{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {!member.enabled ? <Badge tone="danger">Desativado</Badge> : null}
          {member.mustChangePassword ? <Badge tone="warning">Deve alterar senha</Badge> : null}
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-auto px-4"
            loading={toggling}
            onClick={toggleEnabled}
          >
            {member.enabled ? "Desativar" : "Ativar"}
          </Button>
        </div>
      </div>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-lg flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Primeiro nome"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label="Último nome"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>
        <Input
          label="Telefone"
          type="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <Input
          label="Endereço"
          error={errors.address?.message}
          {...register("address")}
        />
        <Input label="Cidade" value="Maputo" disabled {...register("city")} />
        <Select
          label="Bairro"
          error={errors.neighborhood?.message}
          {...register("neighborhood")}
        >
          <option value="" disabled>
            Selecione o bairro
          </option>
          {neighborhoods.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </Select>

        {saveSuccess ? (
          <p className="text-sm text-brand-green">Alterações guardadas.</p>
        ) : null}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-auto px-6">
          Guardar alterações
        </Button>
      </form>
    </div>
  );
}
