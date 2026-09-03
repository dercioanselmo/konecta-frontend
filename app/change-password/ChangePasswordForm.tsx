"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { changePasswordSchema, type ChangePasswordFormValues } from "@/lib/auth/validation";
import { changePassword, ClientApiError, ROLE_HOME_CLIENT } from "@/lib/auth/client";
import type { UserProfile } from "@/lib/auth/types";

export function ChangePasswordForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setFormError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      router.push(ROLE_HOME_CLIENT[user.role]);
    } catch (error) {
      if (error instanceof ClientApiError) {
        setFormError(error.details?.join(" ") ?? error.message);
        return;
      }
      setFormError("Não foi possível alterar a palavra-passe. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={40} />
        <div>
          <h1 className="text-xl font-bold text-foreground">Alterar palavra-passe</h1>
          <p className="text-sm text-muted">Deve definir uma nova palavra-passe antes de continuar.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Palavra-passe atual"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <Input
          label="Nova palavra-passe"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          label="Confirmar nova palavra-passe"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Alterar palavra-passe
        </Button>
      </form>
    </div>
  );
}
