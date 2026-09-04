"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocationSection } from "@/app/profile/LocationSection";
import type { UserProfile } from "@/lib/auth/types";

export function SetLocationView({ user, categoryId }: { user: UserProfile; categoryId: string }) {
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <Link href="/home" className="text-sm text-muted hover:underline">
        ← Voltar
      </Link>

      <div className="mt-4 flex flex-col gap-2 text-center">
        <h1 className="text-xl font-bold text-foreground">Falta só uma coisa</h1>
        <p className="text-sm text-muted">
          Defina a sua localização para vermos as lojas mais próximas de si primeiro.
        </p>
      </div>

      <div className="mt-6">
        <LocationSection user={user} onSaved={() => router.push(`/categories/${categoryId}`)} />
      </div>
    </div>
  );
}
