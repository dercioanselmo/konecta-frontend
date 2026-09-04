"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCategory } from "@/lib/stores/client";
import { ClientApiError } from "@/lib/auth/client";

const schema = z.object({
  code: z
    .string()
    .min(1, "Indique o código")
    .regex(/^[A-Z0-9_]+$/, "Use apenas maiúsculas, números e underscore (ex.: SUPERMERCADO)"),
  name: z.string().min(1, "Indique o nome"),
  sortOrder: z.number().int().min(0),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function NewCategoryPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sortOrder: 0, active: true },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const category = await createCategory(values);
      router.push(`/admin/categories/${category.id}`);
    } catch (error) {
      setFormError(
        error instanceof ClientApiError
          ? (error.details?.join(" ") ?? error.message)
          : "Não foi possível criar a categoria.",
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <Link href="/admin/categories" className="text-sm text-muted hover:underline">
          ← Categorias
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Nova categoria</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, () => setFormError("Verifique os campos assinalados a vermelho abaixo."))}
        className="flex flex-col gap-4"
      >
        <Input
          label="Código"
          placeholder="SUPERMERCADO"
          error={errors.code?.message}
          {...register("code")}
        />
        <Input label="Nome" placeholder="Supermercado" error={errors.name?.message} {...register("name")} />
        <Input
          label="Ordem"
          type="number"
          min="0"
          error={errors.sortOrder?.message}
          {...register("sortOrder", { valueAsNumber: true })}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" defaultChecked {...register("active")} />
          Ativa (visível para clientes)
        </label>

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Criar categoria
        </Button>
      </form>
    </div>
  );
}
