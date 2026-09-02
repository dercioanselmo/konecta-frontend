"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { otpSchema, type OtpFormValues } from "@/lib/auth/validation";
import { verifyOtp, requestOtp, ClientApiError } from "@/lib/auth/client";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  const onSubmit = async ({ code }: OtpFormValues) => {
    setFormError(null);
    try {
      await verifyOtp(email, code, "REGISTER");
      router.push(`/login?verified=1&email=${encodeURIComponent(email)}`);
    } catch (error) {
      if (error instanceof ClientApiError) {
        const messages: Record<string, string> = {
          OTP_EXPIRED: "O código expirou. Peça um novo código.",
          OTP_INVALID: "Código incorreto. Tente novamente.",
          OTP_NOT_FOUND: "Não há um código pendente para este email.",
          OTP_LOCKED: "Demasiadas tentativas. Peça um novo código.",
        };
        setFormError(messages[error.code] ?? error.message);
        return;
      }
      setFormError("Não foi possível verificar o código. Tente novamente.");
    }
  };

  const handleResend = async () => {
    setResending(true);
    setFormError(null);
    try {
      await requestOtp(email, "EMAIL", "REGISTER");
      setResent(true);
    } catch {
      setFormError("Não foi possível reenviar o código. Tente novamente.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <Link href="/login" className="mb-6 flex items-center gap-3">
        <Logo size={40} />
        <h1 className="text-xl font-bold text-foreground">Confirmar código</h1>
      </Link>

      <p className="mb-6 text-sm text-muted">
        Enviámos um código de 6 dígitos para <span className="font-medium text-foreground">{email}</span>.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Código"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          error={errors.code?.message}
          {...register("code")}
        />

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
        {resent ? <p className="text-sm text-brand-green">Novo código enviado.</p> : null}

        <Button type="submit" loading={isSubmitting}>
          Confirmar
        </Button>
        <Button type="button" variant="ghost" loading={resending} onClick={handleResend}>
          Reenviar código
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/login")}>
          Cancelar
        </Button>
      </form>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
