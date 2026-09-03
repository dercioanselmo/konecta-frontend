"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  createProductSchema,
  optionalNumberField,
  stockAdjustSchema,
  type CreateProductFormValues,
  type StockAdjustFormValues,
} from "@/lib/stores/validation";
import {
  getProduct,
  updateProduct,
  setProductActive,
  setProductStock,
  listCategories,
  listSubcategories,
  presignProductPhoto,
  confirmProductPhoto,
  deleteProductPhoto,
  setPrimaryProductPhoto,
} from "@/lib/stores/client";
import { uploadAndConfirm } from "@/lib/stores/upload";
import { ClientApiError } from "@/lib/auth/client";
import type { Category, Photo, Product, Subcategory } from "@/lib/stores/types";

export function ProductDetailView({
  shopId,
  productId,
  basePath = "/merchant/shops",
}: {
  shopId: string;
  productId: string;
  basePath?: string;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stockSaved, setStockSaved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFormValues>({ resolver: zodResolver(createProductSchema) });

  const {
    register: registerStock,
    handleSubmit: handleStockSubmit,
    formState: { errors: stockErrors, isSubmitting: stockSubmitting },
  } = useForm<StockAdjustFormValues>({ resolver: zodResolver(stockAdjustSchema) });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const p = await getProduct(shopId, productId);
      setProduct(p);
      setCategoryId(p.categoryId ?? "");
      reset({
        name: p.name,
        description: p.description,
        subcategoryId: p.subcategoryId ?? "",
        price: p.price,
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold ?? undefined,
        active: p.active,
      });
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar o produto.");
    }
  }, [shopId, productId, reset]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, [load]);

  useEffect(() => {
    const load = categoryId ? listSubcategories(categoryId) : Promise.resolve([]);
    load.then(setSubcategories).catch(() => setSubcategories([]));
  }, [categoryId]);

  const onSubmit = async (values: CreateProductFormValues) => {
    setActionError(null);
    setSaved(false);
    try {
      const updated = await updateProduct(shopId, productId, {
        name: values.name,
        description: values.description,
        subcategoryId: values.subcategoryId || undefined,
        price: values.price,
        stockQuantity: values.stockQuantity,
        lowStockThreshold: values.lowStockThreshold,
        active: values.active,
      });
      setProduct(updated);
      setSaved(true);
    } catch (err) {
      setActionError(
        err instanceof ClientApiError ? (err.details?.join(" ") ?? err.message) : "Não foi possível guardar as alterações.",
      );
    }
  };

  const toggleActive = async () => {
    if (!product) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const updated = await setProductActive(shopId, productId, !product.active);
      setProduct(updated);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setActionBusy(false);
    }
  };

  const onStockSubmit = async ({ quantity }: StockAdjustFormValues) => {
    setActionError(null);
    setStockSaved(false);
    try {
      const updated = await setProductStock(shopId, productId, quantity);
      setProduct(updated);
      setStockSaved(true);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? (err.details?.join(" ") ?? err.message) : "Não foi possível ajustar o stock.");
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const photo = await uploadAndConfirm(
        file,
        (contentType) => presignProductPhoto(shopId, productId, contentType),
        (key) => confirmProductPhoto(shopId, productId, key),
      );
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              photos: photo.isPrimary
                ? [...prev.photos.map((p) => ({ ...p, isPrimary: false })), photo]
                : [...prev.photos, photo],
            }
          : prev,
      );
    } catch (err) {
      setPhotoError(err instanceof ClientApiError ? err.details?.join(" ") ?? err.message : "Não foi possível enviar a foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async (photo: Photo) => {
    setPhotoError(null);
    setBusyPhotoId(photo.id);
    try {
      await deleteProductPhoto(shopId, productId, photo.id);
      setProduct((prev) => (prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photo.id) } : prev));
    } catch (err) {
      setPhotoError(err instanceof ClientApiError ? err.message : "Não foi possível remover a foto.");
    } finally {
      setBusyPhotoId(null);
    }
  };

  const makePrimary = async (photo: Photo) => {
    setPhotoError(null);
    setBusyPhotoId(photo.id);
    try {
      await setPrimaryProductPhoto(shopId, productId, photo.id);
      setProduct((prev) =>
        prev
          ? { ...prev, photos: prev.photos.map((p) => ({ ...p, isPrimary: p.id === photo.id })) }
          : prev,
      );
    } catch (err) {
      setPhotoError(err instanceof ClientApiError ? err.message : "Não foi possível definir a foto principal.");
    } finally {
      setBusyPhotoId(null);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <Link href={`${basePath}/${shopId}/products`} className="text-sm text-muted hover:underline">
          ← Produtos
        </Link>
        <p className="text-sm text-red-500">{loadError}</p>
      </div>
    );
  }

  if (!product) {
    return <p className="text-sm text-muted">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`${basePath}/${shopId}/products`} className="text-sm text-muted hover:underline">
          ← Produtos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          <Badge tone={product.active ? "success" : "neutral"}>{product.active ? "Ativo" : "Inativo"}</Badge>
          {product.lowStock ? <Badge tone="warning">Stock baixo</Badge> : null}
        </div>
      </div>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <form onSubmit={handleStockSubmit(onStockSubmit)} className="flex items-end gap-3">
            <Input
              label="Ajustar stock (quantidade absoluta)"
              type="number"
              min="0"
              defaultValue={product.stockQuantity}
              error={stockErrors.quantity?.message}
              {...registerStock("quantity", { valueAsNumber: true })}
            />
            <Button type="submit" variant="secondary" loading={stockSubmitting} className="w-auto px-5">
              Atualizar stock
            </Button>
          </form>
        {stockSaved ? <p className="text-sm text-brand-green">Stock atualizado.</p> : null}
        <div className="flex-1" />
        <Button type="button" variant="secondary" className="w-auto px-5" disabled={actionBusy} onClick={toggleActive}>
            {product.active ? "Desativar produto" : "Ativar produto"}
          </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Fotos</h2>
          <>
              <Button
                type="button"
                variant="secondary"
                className="w-auto px-4"
                loading={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                Enviar foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelected}
              />
            </>
        </div>

        {photoError ? <p className="text-sm text-red-500">{photoError}</p> : null}

        {product.photos.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há fotos.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {product.photos.map((photo) => (
              <div key={photo.id} className="flex w-32 flex-col gap-1.5">
                <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border bg-background">
                  <Image src={photo.url} alt={product.name} fill sizes="128px" className="object-cover" unoptimized />
                  {photo.isPrimary ? (
                    <span className="absolute left-1 top-1 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-semibold text-white">
                      Principal
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  {!photo.isPrimary ? (
                    <button
                      type="button"
                      disabled={busyPhotoId === photo.id}
                      onClick={() => makePrimary(photo)}
                      className="flex-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground disabled:opacity-60"
                    >
                      Tornar principal
                    </button>
                  ) : null}
                  <button
                      type="button"
                      disabled={busyPhotoId === photo.id}
                      onClick={() => removePhoto(photo)}
                      className="flex-1 rounded-lg border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-500 disabled:opacity-60"
                    >
                      Remover
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, () =>
          setActionError("Verifique os campos assinalados a vermelho abaixo."),
        )}
        className="flex max-w-lg flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Dados do produto</h2>
        <Input label="Nome" error={errors.name?.message} {...register("name")} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Descrição</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/60"
            {...register("description")}
          />
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
          error={errors.lowStockThreshold?.message}
          {...register("lowStockThreshold", optionalNumberField)}
        />

        {saved ? <p className="text-sm text-brand-green">Guardado com sucesso.</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-auto px-6">
            Guardar alterações
          </Button>
      </form>
    </div>
  );
}
