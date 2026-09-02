"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { registerSchema, type RegisterFormValues } from "@/lib/auth/validation";
import { registerCustomer, fetchNeighborhoods, ClientApiError } from "@/lib/auth/client";
import { ROLE_LABELS, REQUESTABLE_ROLES } from "@/lib/auth/roleLabels";
import type { Neighborhood, RequestableRole } from "@/lib/auth/types";

export default function RegisterPage() {
  const router = useRouter();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { city: "Maputo" },
  });

  useEffect(() => {
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
  }, []);

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      await registerCustomer({
        ...values,
        requestedRole: values.requestedRole ? (values.requestedRole as RequestableRole) : undefined,
      });
      router.push(`/verify-otp?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      if (error instanceof ClientApiError) {
        if (error.code === "EMAIL_ALREADY_REGISTERED") {
          setError("email", { message: "Este email já está registado" });
          return;
        }
        setFormError(error.details?.join(" ") ?? error.message);
        return;
      }
      setFormError("Não foi possível criar a conta. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={40} />
        <h1 className="text-xl font-bold text-foreground">Criar conta</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Primeiro nome" autoComplete="given-name" error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Último nome" autoComplete="family-name" error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input label="Palavra-passe" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <Input label="Data de nascimento" type="date" error={errors.birthDate?.message} {...register("birthDate")} />
        <Input label="Telefone" type="tel" placeholder="+2588xxxxxxx" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
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
        <Select label="Quero registar-me como" {...register("requestedRole")} defaultValue="">
          <option value="">Cliente</option>
          {REQUESTABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <p className="-mt-2 text-xs text-muted">
          Escolher Comerciante, Entregador ou Parceiro de Mobilidade cria a sua conta como Cliente enquanto o
          pedido aguarda aprovação da administração.
        </p>

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
