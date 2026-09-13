import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getValidAccessToken } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword, isPendingCourierApplicant } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { CourierShell } from "@/components/courier/CourierShell";
import { courierApiFetch } from "@/lib/courier/courierApi";
import { TRANSPORT_LABELS, type CourierProfile } from "@/lib/courier/types";

export default async function CourierProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier/profile");
  if (!isProfileComplete(user) && user.role !== "COURIER") redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  if (isPendingCourierApplicant(user)) redirect("/courier/onboarding");
  if (user.role !== "COURIER") redirect(roleHomePath(user.role));

  const accessToken = await getValidAccessToken();
  let profile: CourierProfile | null = null;
  let serviceUnavailable = false;

  if (accessToken) {
    try {
      profile = await courierApiFetch<CourierProfile>("/api/v1/couriers/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      serviceUnavailable = true;
    }
  }

  return (
    <CourierShell user={user}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>

        {serviceUnavailable ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
            Não foi possível carregar o seu perfil de entregador de momento.
          </p>
        ) : profile ? (
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-background">
              {profile.photoUrl ? (
                <Image src={profile.photoUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl text-muted">
                  {user.firstName?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted">
                {TRANSPORT_LABELS[profile.transportType]}
                {profile.plateNumber ? ` · ${profile.plateNumber}` : ""}
              </p>
            </div>
            <Link href="/courier/onboarding" className="ml-auto text-sm font-medium text-brand-green hover:underline">
              Editar →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Ainda não concluiu o seu perfil de entregador.{" "}
            <Link href="/courier/onboarding" className="font-semibold text-brand-green hover:underline">
              Concluir perfil →
            </Link>
          </p>
        )}
      </div>
    </CourierShell>
  );
}
