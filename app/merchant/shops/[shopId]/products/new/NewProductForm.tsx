"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createProductSchema, optionalNumberField, type CreateProductFormValues } from "@/lib/stores/validation";
import { createProduct, listCategories, listSubcategories } from "@/lib/stores/client";
import { ClientApiError } from "@/lib/auth/client";
import type { Category, Subcategory } from "@/lib/stores/types";

export function NewProductForm({
  shopId,
  basePath = "/merchant/shops",
}: {
  shopId: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { active: true },
  });

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const load = categoryId ? listSubcategories(categoryId) : Promise.resolve([]);
    load.then(setSubcategories).catch(() => setSubcategories([]));
  }, [categoryId]);

  const onSubmit = async (values: CreateProductFormValues) => {
    setFormError(null);
    try {
      const product = await createProduct(shopId, {
        name: values.name,
        description: values.description,
        subcategoryId: values.subcategoryId || undefined,
        price: values.price,
        stockQuantity: values.stockQuantity,
        lowStockThreshold: values.lowStockThreshold,
        active: values.active,
      });
      router.push(`${basePath}/${shopId}/products/${product.id}`);
    } catch (error) {
      setFormError(
        error instanceof ClientApiError
          ? (error.details?.join(" ") ?? error.message)
          : "Não foi possível criar o produto. Tente novamente.",
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <Link href={`${basePath}/${shopId}/products`} className="text-sm text-muted hover:underline">
          ← Produtos
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Novo produto</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, () =>
          setFormError("Verifique os campos assinalados a vermelho abaixo."),
        )}
        className="flex flex-col gap-4"
      >
        <Input label="Nome" error={errors.name?.message} {...register("name")} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Descrição</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/60"
            {...register("description")}
          />
          {errors.description ? <p className="text-sm text-red-500">{errors.description.message}</p> : null}
        </label>

        <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Selecione a categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select label="Subcategoria" error={errors.subcategoryId?.message} {...register("subcategoryId")} disabled={!categoryId}>
          <option value="">Selecione a subcategoria</option>
          {subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Input
          label="Preço (MT, com IVA incluído)"
          type="number"
          step="0.01"
          min="0"
          error={errors.price?.message}
          {...register("price", { valueAsNumber: true })}
        />
        <Input
          label="Quantidade em stock"
          type="number"
          min="0"
          error={errors.stockQuantity?.message}
          {...register("stockQuantity", { valueAsNumber: true })}
        />
        <Input
          label="Limite de stock baixo"
          type="number"
          min="0"
          placeholder="5"
          error={errors.lowStockThreshold?.message}
          {...register("lowStockThreshold", optionalNumberField)}
        />

        <p className="text-xs text-muted">
          Pode adicionar fotos depois de criar o produto.
        </p>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" defaultChecked {...register("active")} />
          Produto ativo (visível para clientes)
        </label>

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Criar produto
        </Button>
      </form>
    </div>
  );
}
