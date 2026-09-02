"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createUserSchema, type CreateUserFormValues } from "@/lib/admin/validation";
import { createUser } from "@/lib/admin/client";
import { ROLE_LABELS, ONBOARDABLE_ROLES } from "@/lib/admin/roleLabels";
import { ClientApiError, fetchNeighborhoods } from "@/lib/auth/client";
import type { Neighborhood } from "@/lib/auth/types";

export default function NewAdminUserPage() {
  const router = useRouter();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { city: "Maputo" },
  });

  useEffect(() => {
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
  }, []);

  const onSubmit = async (values: CreateUserFormValues) => {
    setFormError(null);
    try {
      const user = await createUser(values);
      router.push(`/admin/users/${user.id}`);
    } catch (error) {
      if (error instanceof ClientApiError) {
        if (error.code === "EMAIL_ALREADY_REGISTERED") {
          setError("email", { message: "Este email já está registado" });
          return;
        }
        setFormError(error.details?.join(" ") ?? error.message);
        return;
      }
      setFormError("Não foi possível criar o utilizador. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <Link href="/admin/users" className="text-sm text-muted hover:underline">
          ← Utilizadores
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Novo utilizador</h1>
        <p className="text-sm text-muted">
          Onboarding direto para lojistas, entregadores ou administração — não passa pelo registo público.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Primeiro nome" error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Último nome" error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <Input label="Telefone" type="tel" placeholder="+2588xxxxxxx" error={errors.phone?.message} {...register("phone")} />
        <Input label="Endereço" error={errors.address?.message} {...register("address")} />
        <Input label="Cidade" value="Maputo" disabled {...register("city")} />
        <Select label="Bairro" error={errors.neighborhood?.message} {...register("neighborhood")} defaultValue="">
          <option value="" disabled>
            Selecione o bairro
          </option>
          {neighborhoods.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </Select>
        <Select label="Função" error={errors.role?.message} {...register("role")} defaultValue="">
          <option value="" disabled>
            Selecione a função
          </option>
          {ONBOARDABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Criar utilizador
        </Button>
      </form>
    </div>
  );
}
