"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  editProfileSchema,
  changePasswordSchema,
  type EditProfileFormValues,
  type ChangePasswordFormValues,
} from "@/lib/auth/validation";
import {
  updateProfile,
  changePassword,
  presignUserPhoto,
  confirmUserPhoto,
  fetchNeighborhoods,
  ClientApiError,
} from "@/lib/auth/client";
import { uploadAndConfirm } from "@/lib/stores/upload";
import { LocationSection } from "./LocationSection";
import { PreferencesSection } from "./PreferencesSection";
import type { Neighborhood, UserProfile } from "@/lib/auth/types";

export function ProfileForm({ user: initialUser }: { user: UserProfile }) {
  const [user, setUser] = useState(initialUser);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? "",
      address: user.address ?? "",
      city: "Maputo",
      neighborhood: user.neighborhood ?? "",
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
  }, []);

  const onProfileSubmit = useCallback(async (values: EditProfileFormValues) => {
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const updated = await updateProfile(values);
      setUser(updated);
      setProfileSuccess(true);
    } catch (error) {
      setProfileError(
        error instanceof ClientApiError
          ? (error.details?.join(" ") ?? error.message)
          : "Não foi possível guardar as alterações.",
      );
    }
  }, []);

  const onPasswordSubmit = useCallback(async (values: ChangePasswordFormValues) => {
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      passwordForm.reset();
      setPasswordSuccess(true);
    } catch (error) {
      setPasswordError(
        error instanceof ClientApiError
          ? (error.details?.join(" ") ?? error.message)
          : "Não foi possível alterar a palavra-passe.",
      );
    }
  }, [passwordForm]);

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      // 1. Presign + PUT to S3 + confirm (returns presigned GET url for preview)
      const { url: previewUrl } = await uploadAndConfirm(
        file,
        (contentType) => presignUserPhoto(contentType),
        (key) => confirmUserPhoto(key),
      );
      // 2. Save the URL on the Security service profile
      // The confirm step returns a presigned GET URL (~1h TTL) — per context.md
      // the open question is whether to store the stable key or the presigned URL.
      // The API doc says "store as-is" and to coordinate with backend to return
      // the permanent URL from confirm. We store what confirm returns for now.
      const updated = await updateProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
        address: user.address ?? "",
        city: "Maputo",
        neighborhood: user.neighborhood ?? "",
        photoUrl: previewUrl,
      });
      setUser(updated);
    } catch (error) {
      setPhotoError(
        error instanceof ClientApiError
          ? (error.details?.join(" ") ?? error.message)
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Photo */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Foto de perfil</h2>
        {photoError ? <p className="text-sm text-red-500">{photoError}</p> : null}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-background">
            {user.photoUrl ? (
              <Image src={user.photoUrl} alt="Foto de perfil" fill sizes="80px" className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl text-muted">
                {user.firstName?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-auto px-4"
            loading={uploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
          >
            Alterar foto
          </Button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoSelected}
          />
        </div>
      </div>

      {/* Profile details */}
      <form
        onSubmit={profileForm.handleSubmit(onProfileSubmit)}
        className="flex max-w-lg flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Dados pessoais</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Primeiro nome"
            autoComplete="given-name"
            error={profileForm.formState.errors.firstName?.message}
            {...profileForm.register("firstName")}
          />
          <Input
            label="Último nome"
            autoComplete="family-name"
            error={profileForm.formState.errors.lastName?.message}
            {...profileForm.register("lastName")}
          />
        </div>
        <Input
          label="Telefone"
          type="tel"
          autoComplete="tel"
          error={profileForm.formState.errors.phone?.message}
          {...profileForm.register("phone")}
        />
        <Input
          label="Endereço"
          error={profileForm.formState.errors.address?.message}
          {...profileForm.register("address")}
        />
        <Input label="Cidade" value="Maputo" disabled {...profileForm.register("city")} />
        <Select
          label="Bairro"
          error={profileForm.formState.errors.neighborhood?.message}
          {...profileForm.register("neighborhood")}
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

        {profileError ? <p className="text-sm text-red-500">{profileError}</p> : null}
        {profileSuccess ? (
          <p className="text-sm text-brand-green">Dados guardados com sucesso.</p>
        ) : null}

        <Button
          type="submit"
          loading={profileForm.formState.isSubmitting}
          className="mt-2 w-auto px-6"
        >
          Guardar alterações
        </Button>
      </form>

      <LocationSection user={user} onSaved={setUser} />

      <PreferencesSection />

      {/* Change password */}
      <form
        onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
        className="flex max-w-lg flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Alterar palavra-passe</h2>
        <Input
          label="Palavra-passe atual"
          type="password"
          autoComplete="current-password"
          error={passwordForm.formState.errors.currentPassword?.message}
          {...passwordForm.register("currentPassword")}
        />
        <Input
          label="Nova palavra-passe"
          type="password"
          autoComplete="new-password"
          error={passwordForm.formState.errors.newPassword?.message}
          {...passwordForm.register("newPassword")}
        />
        <Input
          label="Confirmar nova palavra-passe"
          type="password"
          autoComplete="new-password"
          error={passwordForm.formState.errors.confirmPassword?.message}
          {...passwordForm.register("confirmPassword")}
        />

        {passwordError ? <p className="text-sm text-red-500">{passwordError}</p> : null}
        {passwordSuccess ? (
          <p className="text-sm text-brand-green">Palavra-passe alterada com sucesso.</p>
        ) : null}

        <Button
          type="submit"
          loading={passwordForm.formState.isSubmitting}
          className="mt-2 w-auto px-6"
        >
          Alterar palavra-passe
        </Button>
      </form>
    </div>
  );
}
