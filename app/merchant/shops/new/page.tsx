"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createShopSchema, type CreateShopFormValues } from "@/lib/stores/validation";
import { createShop, listCategories } from "@/lib/stores/client";
import { ClientApiError, fetchNeighborhoods } from "@/lib/auth/client";
import type { Category } from "@/lib/stores/types";
import type { Neighborhood } from "@/lib/auth/types";

export default function NewShopPage() {
  const router = useRouter();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateShopFormValues>({
    resolver: zodResolver(createShopSchema),
    defaultValues: { city: "Maputo", categoryIds: [] },
  });

  useEffect(() => {
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const onSubmit = async (values: CreateShopFormValues) => {
    setFormError(null);
    try {
      const shop = await createShop(values);
      router.push(`/merchant/shops/${shop.id}`);
    } catch (error) {
      setFormError(error instanceof ClientApiError ? error.details?.join(" ") ?? error.message : "Não foi possível criar a loja. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <Link href="/merchant" className="text-sm text-muted hover:underline">
          ← As suas lojas
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Nova loja</h1>
        <p className="text-sm text-muted">
          Pode terminar de preencher os dados fiscais mais tarde — a loja fica em rascunho até ter nome,
          NUIT, endereço, cidade e bairro preenchidos.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nome da loja" error={errors.name?.message} {...register("name")} />
        <Input label="NUIT" error={errors.nuit?.message} {...register("nuit")} />
        <Input label="Telefone" type="tel" placeholder="+2588xxxxxxx" error={errors.phone?.message} {...register("phone")} />
        <Input label="Endereço" error={errors.address?.message} {...register("address")} />
        <Input label="Cidade" value="Maputo" disabled {...register("city")} />
        <Select label="Bairro" error={errors.neighborhood?.message} {...register("neighborhood")} defaultValue="">
          <option value="">Selecione o bairro</option>
          {neighborhoods.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Categorias</span>
          <Controller
            control={control}
            name="categoryIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const checked = field.value?.includes(c.id) ?? false;
                  return (
                    <label
                      key={c.id}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        checked
                          ? "border-brand-green bg-brand-green/10 text-brand-green"
                          : "border-border bg-surface text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(field.value ?? []);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          field.onChange(Array.from(next));
                        }}
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            )}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Descrição</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/60"
            {...register("description")}
          />
        </label>

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Criar loja
        </Button>
      </form>
    </div>
  );
}
