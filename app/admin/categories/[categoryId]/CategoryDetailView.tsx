"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getAdminCategory,
  updateCategory,
  deleteCategory,
  presignCategoryImage,
  confirmCategoryImage,
  listAdminSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  listAllShops,
} from "@/lib/stores/client";
import { uploadAndConfirm } from "@/lib/stores/upload";
import { ClientApiError } from "@/lib/auth/client";
import type { AdminShopSummary, Category, Subcategory } from "@/lib/stores/types";

const editSchema = z.object({
  name: z.string().min(1, "Indique o nome"),
  sortOrder: z.number().int().min(0),
  active: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

const subSchema = z.object({
  code: z.string().min(1, "Indique o código").regex(/^[A-Z0-9_]+$/, "Maiúsculas, números e underscore"),
  name: z.string().min(1, "Indique o nome"),
  sortOrder: z.number().int().min(0),
});
type SubFormValues = z.infer<typeof subSchema>;

export function CategoryDetailView({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [shops, setShops] = useState<AdminShopSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [c, subs, shopsPage] = await Promise.all([
        getAdminCategory(categoryId),
        listAdminSubcategories(categoryId),
        listAllShops({ categoryId, page: 0, size: 50 }),
      ]);
      setCategory(c);
      reset({ name: c.name, sortOrder: c.sortOrder, active: c.active });
      setSubcategories(subs.sort((a, b) => a.sortOrder - b.sortOrder));
      setShops(shopsPage.content);
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar a categoria.");
    }
  }, [categoryId, reset]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const onSubmit = async (values: EditFormValues) => {
    setActionError(null);
    setSaved(false);
    try {
      const updated = await updateCategory(categoryId, values);
      setCategory(updated);
      setSaved(true);
    } catch (err) {
      setActionError(
        err instanceof ClientApiError ? (err.details?.join(" ") ?? err.message) : "Não foi possível guardar.",
      );
    }
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    setUploadingImage(true);
    try {
      const updated = await uploadAndConfirm(
        file,
        (contentType) => presignCategoryImage(categoryId, contentType),
        (key) => confirmCategoryImage(categoryId, key),
      );
      setCategory(updated);
    } catch (err) {
      setImageError(err instanceof ClientApiError ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Eliminar esta categoria? Só é possível se não tiver subcategorias nem lojas associadas.")) return;
    setActionError(null);
    setDeleting(true);
    try {
      await deleteCategory(categoryId);
      router.push("/admin/categories");
    } catch (err) {
      setActionError(
        err instanceof ClientApiError ? err.message : "Não foi possível eliminar a categoria.",
      );
      setDeleting(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/admin/categories" className="text-sm text-muted hover:underline">
          ← Categorias
        </Link>
        <p className="text-sm text-red-500">{loadError}</p>
      </div>
    );
  }

  if (!category) {
    return <p className="text-sm text-muted">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/categories" className="text-sm text-muted hover:underline">
          ← Categorias
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
          <Badge tone={category.active ? "success" : "neutral"}>{category.active ? "Ativa" : "Inativa"}</Badge>
          <span className="font-mono text-xs text-muted">{category.code}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Imagem</h2>
        {imageError ? <p className="text-sm text-red-500">{imageError}</p> : null}
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
            {category.imageUrl ? (
              <Image src={category.imageUrl} alt={category.name} fill sizes="96px" className="object-cover" unoptimized />
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-auto px-4"
            loading={uploadingImage}
            onClick={() => imageInputRef.current?.click()}
          >
            Alterar imagem
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageSelected}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, () => setActionError("Verifique os campos assinalados a vermelho."))} className="flex max-w-lg flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Dados</h2>
        <Input label="Nome" error={errors.name?.message} {...register("name")} />
        <Input
          label="Ordem"
          type="number"
          min="0"
          error={errors.sortOrder?.message}
          {...register("sortOrder", { valueAsNumber: true })}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" {...register("active")} />
          Ativa (visível para clientes)
        </label>

        {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
        {saved ? <p className="text-sm text-brand-green">Guardado com sucesso.</p> : null}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSubmitting} className="w-auto px-6">
            Guardar alterações
          </Button>
          <Button type="button" variant="secondary" className="w-auto px-6 text-red-500" loading={deleting} onClick={handleDelete}>
            Eliminar categoria
          </Button>
        </div>
      </form>

      <SubcategoriesSection categoryId={categoryId} subcategories={subcategories} onChanged={setSubcategories} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Lojas nesta categoria</h2>
        {shops.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma loja nesta categoria.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {shops.map((s) => (
              <Link
                key={s.id}
                href={`/admin/shops/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 hover:bg-surface-hover"
              >
                <span className="font-medium text-foreground">{s.name}</span>
                <Badge tone={s.isOpen ? "success" : "neutral"}>{s.isOpen ? "Aberta" : "Fechada"}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubcategoriesSection({
  categoryId,
  subcategories,
  onChanged,
}: {
  categoryId: string;
  subcategories: Subcategory[];
  onChanged: (subs: Subcategory[]) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubFormValues>({ resolver: zodResolver(subSchema), defaultValues: { sortOrder: 0 } });

  const onCreate = async (values: SubFormValues) => {
    setError(null);
    try {
      const created = await createSubcategory(categoryId, values);
      onChanged([...subcategories, created].sort((a, b) => a.sortOrder - b.sortOrder));
      reset({ code: "", name: "", sortOrder: 0 });
      setShowNew(false);
    } catch (err) {
      setError(
        err instanceof ClientApiError ? (err.details?.join(" ") ?? err.message) : "Não foi possível criar a subcategoria.",
      );
    }
  };

  const toggleActive = async (sub: Subcategory) => {
    setError(null);
    setBusyId(sub.id);
    try {
      const updated = await updateSubcategory(categoryId, sub.id, {
        name: sub.name,
        sortOrder: sub.sortOrder,
        active: !sub.active,
      });
      onChanged(subcategories.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar a subcategoria.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (sub: Subcategory) => {
    if (!confirm(`Eliminar "${sub.name}"? Só é possível se nenhum produto a usar.`)) return;
    setError(null);
    setBusyId(sub.id);
    try {
      await deleteSubcategory(categoryId, sub.id);
      onChanged(subcategories.filter((s) => s.id !== sub.id));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Não foi possível eliminar a subcategoria.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Subcategorias</h2>
        <Button type="button" variant="secondary" className="w-auto px-4" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancelar" : "Nova subcategoria"}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {showNew ? (
        <form onSubmit={handleSubmit(onCreate)} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
          <div className="min-w-[160px]">
            <Input label="Código" placeholder="LEGUMES_E_FRUTAS" error={errors.code?.message} {...register("code")} />
          </div>
          <div className="min-w-[160px]">
            <Input label="Nome" placeholder="Legumes e Frutas" error={errors.name?.message} {...register("name")} />
          </div>
          <div className="w-24">
            <Input label="Ordem" type="number" min="0" error={errors.sortOrder?.message} {...register("sortOrder", { valueAsNumber: true })} />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-auto px-6">
            Criar
          </Button>
        </form>
      ) : null}

      {subcategories.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma subcategoria.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {subcategories.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="font-mono text-xs text-muted">{s.code}</span>
                <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Ativa" : "Inativa"}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-auto px-3 text-sm"
                  disabled={busyId === s.id}
                  loading={busyId === s.id}
                  onClick={() => toggleActive(s)}
                >
                  {s.active ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-auto px-3 text-sm text-red-500"
                  disabled={busyId === s.id}
                  onClick={() => remove(s)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
