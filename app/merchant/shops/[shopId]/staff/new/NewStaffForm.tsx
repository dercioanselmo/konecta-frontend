"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createStaff } from "@/lib/merchant/client";
import { fetchNeighborhoods, ClientApiError } from "@/lib/auth/client";
import { phoneRegex } from "@/lib/auth/validation";
import type { Neighborhood } from "@/lib/auth/types";

const schema = z
  .object({
    firstName: z.string().min(1, "Indique o primeiro nome"),
    lastName: z.string().min(1, "Indique o último nome"),
    email: z.email("Indique um email válido"),
    password: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a palavra-passe"),
    phone: z.string().regex(phoneRegex, "Número de telefone moçambicano inválido"),
    address: z.string().min(1, "Indique o endereço"),
    city: z.literal("Maputo"),
    neighborhood: z.string().min(1, "Selecione o bairro"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

interface NewStaffFormProps {
  shopId: string;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

export function NewStaffForm({
  shopId,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: NewStaffFormProps) {
  const router = useRouter();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { city: "Maputo" },
  });

  useEffect(() => {
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
  }, []);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await createStaff({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        phone: values.phone,
        address: values.address,
        city: values.city,
        neighborhood: values.neighborhood,
        shopId,
      });
      router.push(`${basePath}/${shopId}/staff`);
    } catch (error) {
      setFormError(
        error instanceof ClientApiError
          ? (error.details?.join(" ") ?? error.message)
          : "Não foi possível criar o funcionário.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-lg flex-col gap-4">
        <h2 className="text-xl font-bold text-foreground">Novo funcionário</h2>
        <p className="text-sm text-muted">
          O funcionário terá de alterar a palavra-passe no primeiro acesso.
        </p>

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
          label="Email"
          type="email"
          autoComplete="off"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Palavra-passe inicial"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirmar palavra-passe"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Input
          label="Telefone"
          type="tel"
          placeholder="+2588xxxxxxx"
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

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Criar funcionário
        </Button>
      </form>
    </div>
  );
}
