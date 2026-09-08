"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { PreferencesSection } from "@/app/profile/PreferencesSection";
import { LocationPicker, MAPUTO_DEFAULT } from "@/components/customer/LocationPicker";
import { useDeviceLocationDefault } from "@/lib/geo/useDeviceLocationDefault";
import type { Neighborhood, RequestableRole, UserPreferences } from "@/lib/auth/types";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const requestedRoleParam = searchParams.get("requestedRole");
  const initialRequestedRole = REQUESTABLE_ROLES.includes(requestedRoleParam as RequestableRole)
    ? (requestedRoleParam as RequestableRole)
    : "";
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    deliveryPreference: null,
    paymentMethod: null,
  });
  const [position, setPosition] = useState<[number, number]>(MAPUTO_DEFAULT);
  useDeviceLocationDefault(false, (lat, lng) => setPosition([lat, lng]));
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedRequestedRole, setSelectedRequestedRole] = useState<RequestableRole | "">(initialRequestedRole);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { city: "Maputo", requestedRole: initialRequestedRole },
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
      const verifyUrl = new URL("/verify-otp", window.location.origin);
      verifyUrl.searchParams.set("email", values.email);
      if (nextPath) verifyUrl.searchParams.set("next", nextPath);
      // Carried through OTP verify → login, then applied via PATCH .../preferences
      // right after first login — the register/verify steps have no session yet
      // to call that authenticated endpoint directly.
      if (preferences.deliveryPreference) verifyUrl.searchParams.set("deliveryPreference", preferences.deliveryPreference);
      if (preferences.paymentMethod) verifyUrl.searchParams.set("paymentMethod", preferences.paymentMethod);
      // Same reasoning as preferences above — no session yet to call
      // PATCH .../location directly, so the pinned coordinates ride along
      // through OTP verify → login and get saved right after first login.
      verifyUrl.searchParams.set("latitude", String(position[0]));
      verifyUrl.searchParams.set("longitude", String(position[1]));
      router.push(`${verifyUrl.pathname}${verifyUrl.search}`);
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
      <Link href="/home" className="mb-6 flex items-center gap-3">
        <Logo size={40} />
        <h1 className="text-xl font-bold text-foreground">Criar conta</h1>
      </Link>

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

        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Localização</h2>
          <p className="mb-3 text-xs text-muted">
            Usada para mostrar lojas e produtos mais próximos de si — ajuste o pin se não estiver correto.
          </p>
          <LocationPicker latitude={position[0]} longitude={position[1]} onChange={(lat, lng) => setPosition([lat, lng])} />
        </div>

        <Select
          label="Quero registar-me como"
          defaultValue={initialRequestedRole}
          {...register("requestedRole", {
            onChange: (e) => setSelectedRequestedRole(e.target.value as RequestableRole | ""),
          })}
        >
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
        {selectedRequestedRole === "COURIER" ? (
          <p className="-mt-2 text-xs text-brand-orange">
            A seguir ao registo, terá de completar o seu perfil de entregador — localização de base, meio de
            transporte, documentos (BI, Carta de Condução ou Passaporte) e foto — antes da aprovação da
            administração e de se poder associar a lojas.
          </p>
        ) : null}

        <div className="rounded-2xl border border-border bg-surface p-4">
          <PreferencesSection value={preferences} onChange={setPreferences} />
        </div>

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link
          href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
