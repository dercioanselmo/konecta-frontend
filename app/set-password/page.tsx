"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { setPasswordSchema, type SetPasswordFormValues } from "@/lib/auth/validation";
import { setPassword, ClientApiError, ROLE_HOME_CLIENT } from "@/lib/auth/client";
import { isProfileComplete } from "@/lib/auth/profile";

/**
 * Landing page for the "Set up your KONECTA account" invite email sent by
 * POST /admin/users. Expects ?email=...&code=... on the URL (the invite
 * link's exact shape is a backend decision — this is the frontend's
 * assumption; confirm it matches what the email template actually sends).
 */
function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const code = searchParams.get("code") ?? "";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormValues>({ resolver: zodResolver(setPasswordSchema) });

  const onSubmit = async ({ newPassword }: SetPasswordFormValues) => {
    setFormError(null);
    try {
      const user = await setPassword(email, code, newPassword);
      router.push(isProfileComplete(user) ? ROLE_HOME_CLIENT[user.role] : "/complete-profile");
    } catch (error) {
      if (error instanceof ClientApiError) {
        const messages: Record<string, string> = {
          OTP_EXPIRED: "Este link expirou. Peça à administração para enviar um novo convite.",
          OTP_INVALID: "Link inválido.",
          OTP_NOT_FOUND: "Não há um convite pendente para este email.",
          OTP_LOCKED: "Demasiadas tentativas. Peça um novo convite.",
          USER_NOT_FOUND: "Não foi encontrada uma conta para este email.",
        };
        setFormError(messages[error.code] ?? error.message);
        return;
      }
      setFormError("Não foi possível definir a palavra-passe. Tente novamente.");
    }
  };

  if (!email || !code) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col justify-center px-6 py-8">
        <p className="text-sm text-red-500">
          Este link não é válido. Use o link enviado por email pela administração.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col justify-center px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={40} />
        <h1 className="text-xl font-bold text-foreground">Definir palavra-passe</h1>
      </div>

      <p className="mb-6 text-sm text-muted">
        A concluir a configuração da conta <span className="font-medium text-foreground">{email}</span>.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Nova palavra-passe"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          label="Confirmar palavra-passe"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <Button type="submit" loading={isSubmitting}>
          Concluir
        </Button>
      </form>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
