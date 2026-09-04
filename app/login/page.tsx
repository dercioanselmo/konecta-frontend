"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginSchema, type LoginFormValues } from "@/lib/auth/validation";
import { login, ClientApiError, ROLE_HOME_CLIENT, isGmailAddress } from "@/lib/auth/client";
import { isProfileComplete } from "@/lib/auth/profile";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "1";
  const oauthFailed = searchParams.get("error") === "google_oauth_failed";
  const nextPath = searchParams.get("next");
  const [formError, setFormError] = useState<string | null>(null);
  const [redirectingToGoogle, setRedirectingToGoogle] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get("email") ?? "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      const user = await login(values.email, values.password);
      if (!isProfileComplete(user)) {
        router.push(nextPath ? `/complete-profile?next=${encodeURIComponent(nextPath)}` : "/complete-profile");
        return;
      }
      router.push(nextPath || ROLE_HOME_CLIENT[user.role]);
    } catch (error) {
      if (error instanceof ClientApiError) {
        if (error.code === "INVALID_CREDENTIALS" && isGmailAddress(values.email)) {
          // Gmail addresses are almost always Google-registered accounts with
          // no local password — a failed password login here is more likely
          // "wrong login method" than "wrong password", so send them through
          // Google instead of showing a dead-end error.
          setRedirectingToGoogle(true);
          // Full browser navigation (not router.push) is deliberate: this
          // route handler 307s onward to Google's OAuth consent screen, the
          // same external redirect the "Continuar com Google" link below
          // triggers — a client-side transition can't follow that.
          window.location.assign(
            nextPath ? `/api/auth/google/start?next=${encodeURIComponent(nextPath)}` : "/api/auth/google/start",
          );
          return;
        }
        if (error.code === "INVALID_CREDENTIALS") {
          setFormError("Email ou palavra-passe incorretos.");
          return;
        }
        if (error.code === "ACCOUNT_DISABLED") {
          setFormError("Esta conta foi desativada. Contacte o suporte.");
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError("Não foi possível entrar. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col justify-center px-6 py-8">
      <Link href="/login" className="mb-6 flex items-center gap-3">
        <Logo size={40} />
        <h1 className="text-xl font-bold text-foreground">Entrar</h1>
      </Link>

      {justVerified ? (
        <p className="mb-4 rounded-xl bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          Conta confirmada. Inicie sessão para continuar.
        </p>
      ) : null}
      {oauthFailed ? (
        <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
          Não foi possível entrar com o Google. Tente novamente.
        </p>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input
          label="Palavra-passe"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
        {redirectingToGoogle ? (
          <p className="text-sm text-muted">Esta conta usa o Google. A redirecionar…</p>
        ) : null}

        <Button type="submit" loading={isSubmitting || redirectingToGoogle}>
          Entrar
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <a
        href={nextPath ? `/api/auth/google/start?next=${encodeURIComponent(nextPath)}` : "/api/auth/google/start"}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A11.99 11.99 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
        </svg>
        Continuar com Google
      </a>

      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/register" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
