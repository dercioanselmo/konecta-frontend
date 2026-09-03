"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { editShopSchema, type EditShopFormValues } from "@/lib/stores/validation";
import {
  getShop,
  updateShop,
  setShopStatus,
  listCategories,
  presignShopLogo,
  confirmShopLogo,
  presignShopCover,
  confirmShopCover,
} from "@/lib/stores/client";
import { uploadAndConfirm } from "@/lib/stores/upload";
import { ClientApiError, fetchNeighborhoods } from "@/lib/auth/client";
import type { Category, Shop } from "@/lib/stores/types";
import type { Neighborhood } from "@/lib/auth/types";

interface ShopSettingsFormProps {
  shopId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

export function ShopSettingsForm({
  shopId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: ShopSettingsFormProps) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditShopFormValues>({ resolver: zodResolver(editShopSchema) });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const s = await getShop(shopId);
      setShop(s);
      reset({
        name: s.name,
        legalName: s.legalName ?? "",
        nuit: s.nuit ?? "",
        email: s.email ?? "",
        phone: s.phone ?? "",
        address: s.address ?? "",
        city: "Maputo",
        neighborhood: s.neighborhood ?? "",
        categoryIds: s.categories.map((c) => c.id),
        description: s.description ?? "",
        acceptsPickup: s.acceptsPickup,
        acceptsDelivery: s.acceptsDelivery,
      });
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar a loja.");
    }
  }, [shopId, reset]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, [load]);

  const onSubmit = async (values: EditShopFormValues) => {
    setActionError(null);
    setSaved(false);
    try {
      const updated = await updateShop(shopId, values);
      setShop(updated);
      setSaved(true);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.details?.join(" ") ?? err.message : "Não foi possível guardar as alterações.");
    }
  };

  const handleLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    setUploadingLogo(true);
    try {
      const updated = await uploadAndConfirm(
        file,
        (contentType) => presignShopLogo(shopId, contentType),
        (key) => confirmShopLogo(shopId, key),
      );
      setShop(updated);
    } catch (err) {
      setImageError(err instanceof ClientApiError ? err.details?.join(" ") ?? err.message : "Não foi possível enviar o logótipo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    setUploadingCover(true);
    try {
      const updated = await uploadAndConfirm(
        file,
        (contentType) => presignShopCover(shopId, contentType),
        (key) => confirmShopCover(shopId, key),
      );
      setShop(updated);
    } catch (err) {
      setImageError(err instanceof ClientApiError ? err.details?.join(" ") ?? err.message : "Não foi possível enviar a capa.");
    } finally {
      setUploadingCover(false);
    }
  };

  const toggleManualClose = async () => {
    if (!shop) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const updated = await setShopStatus(shopId, { manuallyClosed: !shop.manuallyClosed });
      setShop(updated);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar o estado da loja.");
    } finally {
      setActionBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <ShopNav shopId={shopId} shopName="Loja" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />
        <p className="text-sm text-red-500">{loadError}</p>
      </div>
    );
  }

  if (!shop) {
    return <p className="text-sm text-muted">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName={shop.name} hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <Badge tone={shop.manuallyClosed ? "danger" : "success"}>
          {shop.manuallyClosed ? "Pausada manualmente" : "Segue o horário"}
        </Badge>
        <p className="flex-1 text-sm text-muted">
          {shop.manuallyClosed
            ? "A loja está fechada mesmo dentro do horário definido."
            : "A loja abre/fecha automaticamente conforme o horário."}
        </p>
        <Button type="button" variant="secondary" className="w-auto px-5" disabled={actionBusy} onClick={toggleManualClose}>
          {shop.manuallyClosed ? "Retomar horário" : "Pausar loja"}
        </Button>
      </div>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Logótipo e capa</h2>
        {imageError ? <p className="text-sm text-red-500">{imageError}</p> : null}
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-background">
              {shop.logoUrl ? (
                <Image src={shop.logoUrl} alt="Logótipo" fill sizes="96px" className="object-cover" unoptimized />
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-auto px-4"
              loading={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              Alterar logótipo
            </Button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoSelected}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-border bg-background">
              {shop.coverUrl ? (
                <Image src={shop.coverUrl} alt="Capa" fill sizes="160px" className="object-cover" unoptimized />
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-auto px-4"
              loading={uploadingCover}
              onClick={() => coverInputRef.current?.click()}
            >
              Alterar capa
            </Button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCoverSelected}
            />
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, () =>
          setActionError("Verifique os campos assinalados a vermelho abaixo."),
        )}
        className="flex max-w-lg flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Dados fiscais e perfil</h2>
        <Input label="Nome da loja" error={errors.name?.message} {...register("name")} />
        <Input label="Nome legal" error={errors.legalName?.message} {...register("legalName")} />
        <Input label="NUIT" error={errors.nuit?.message} {...register("nuit")} />
        <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <Input label="Telefone" type="tel" error={errors.phone?.message} {...register("phone")} />
        <Input label="Endereço" error={errors.address?.message} {...register("address")} />
        <Input label="Cidade" value="Maputo" disabled {...register("city")} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Bairro</span>
          <select
            className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-brand-green/60"
            {...register("neighborhood")}
          >
            <option value="">Selecione o bairro</option>
            {neighborhoods.map((n) => (
              <option key={n.name} value={n.name}>
                {n.name}
              </option>
            ))}
          </select>
          {errors.neighborhood ? <p className="text-sm text-red-500">{errors.neighborhood.message}</p> : null}
        </label>

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

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" {...register("acceptsPickup")} />
            Aceita levantamento na loja
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" {...register("acceptsDelivery")} />
            Aceita entrega
          </label>
        </div>

        {saved ? <p className="text-sm text-brand-green">Guardado com sucesso.</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-auto px-6">
          Guardar alterações
        </Button>
      </form>
    </div>
  );
}
