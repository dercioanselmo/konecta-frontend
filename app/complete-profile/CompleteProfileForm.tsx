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
import { completeProfileSchema, type CompleteProfileFormValues } from "@/lib/auth/validation";
import { completeProfile, setUserLocation, fetchNeighborhoods, ClientApiError, ROLE_HOME_CLIENT } from "@/lib/auth/client";
import { LocationPicker, MAPUTO_DEFAULT } from "@/components/customer/LocationPicker";
import { useDeviceLocationDefault } from "@/lib/geo/useDeviceLocationDefault";
import type { Neighborhood, UserProfile } from "@/lib/auth/types";

export function CompleteProfileForm({ user, nextPath }: { user: UserProfile; nextPath?: string }) {
  const router = useRouter();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const hasSavedLocation = user.latitude != null && user.longitude != null;
  const [position, setPosition] = useState<[number, number]>(
    hasSavedLocation ? [user.latitude!, user.longitude!] : MAPUTO_DEFAULT,
  );
  useDeviceLocationDefault(hasSavedLocation, (lat, lng) => setPosition([lat, lng]));
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileFormValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      address: user.address ?? "",
      city: "Maputo",
      neighborhood: user.neighborhood ?? "",
    },
  });

  useEffect(() => {
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
  }, []);

  const onSubmit = async (values: CompleteProfileFormValues) => {
    setFormError(null);
    try {
      const [latitude, longitude] = position;
      const [updated] = await Promise.all([completeProfile(values), setUserLocation(latitude, longitude)]);
      router.push(nextPath || ROLE_HOME_CLIENT[updated.role]);
    } catch (error) {
      if (error instanceof ClientApiError) {
        setFormError(error.details?.join(" ") ?? error.message);
        return;
      }
      setFormError("Não foi possível guardar os dados. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <Link href={ROLE_HOME_CLIENT[user.role]} className="mb-2 flex items-center gap-3">
        <Logo size={40} />
        <h1 className="text-xl font-bold text-foreground">Concluir registo</h1>
      </Link>
      <p className="mb-6 text-sm text-muted">
        Entrou com {user.email}. Falta preencher estes dados para usar a KONECTA.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Primeiro nome" autoComplete="given-name" error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Último nome" autoComplete="family-name" error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <Input label="Telefone" type="tel" placeholder="+2588xxxxxxx" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
        <Input label="Endereço" error={errors.address?.message} {...register("address")} />
        <Input label="Cidade" value="Maputo" disabled {...register("city")} />
        <Select label="Bairro" error={errors.neighborhood?.message} {...register("neighborhood")} defaultValue={user.neighborhood ?? ""}>
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

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Concluir
        </Button>
      </form>
    </div>
  );
}
