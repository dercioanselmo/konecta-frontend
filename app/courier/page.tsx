import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getValidAccessToken } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword, isPendingCourierApplicant } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { ROLE_LABELS } from "@/lib/auth/roleLabels";
import { CourierShell } from "@/components/courier/CourierShell";
import { CourierOrdersDashboard } from "./CourierOrdersDashboard";
import { courierApiFetch, CourierServiceError } from "@/lib/courier/courierApi";
import { TRANSPORT_LABELS, ASSOCIATION_STATUS_LABELS, type CourierProfile, type CourierShopAssociation } from "@/lib/courier/types";

export default async function CourierHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  // A pending courier applicant must complete their profile before the
  // admin approval that would actually flip their role to COURIER — send
  // them straight to onboarding rather than a hub that assumes they're
  // already approved.
  if (isPendingCourierApplicant(user)) redirect("/courier/onboarding");
  if (user.role !== "COURIER") redirect(roleHomePath(user.role));

  const accessToken = await getValidAccessToken();
  let profile: CourierProfile | null = null;
  let shops: CourierShopAssociation[] = [];
  let serviceUnavailable = false;

  if (accessToken) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    try {
      profile = await courierApiFetch<CourierProfile>("/api/v1/couriers/me", { headers });
      try {
        shops = await courierApiFetch<CourierShopAssociation[]>("/api/v1/couriers/me/shops", { headers });
      } catch {
        // Non-fatal — the profile summary still renders without the shops list.
      }
    } catch (err) {
      if (err instanceof CourierServiceError && err.status === 404) {
        redirect("/courier/onboarding");
      }
      // Any other failure (including the proposed service not existing yet)
      // — show a degrade-cleanly banner rather than crashing the page.
      serviceUnavailable = true;
    }
  }

  return (
    <CourierShell user={user}>
      <CourierOrdersDashboard profileComplete={profile != null} />
      <div className="mt-6 flex flex-col gap-6">
        {user.status === "PENDING" && user.requestedRole ? (
          <p className="rounded-xl bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
            O seu pedido para se tornar {ROLE_LABELS[user.requestedRole]} está pendente de aprovação.
          </p>
        ) : null}

        {serviceUnavailable ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
            Não foi possível carregar o seu perfil de entregador de momento.
          </p>
        ) : profile ? (
          <>
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

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Lojas associadas</h2>
                <Link href="/courier/stores" className="text-sm font-medium text-brand-green hover:underline">
                  Gerir lojas →
                </Link>
              </div>
              {shops.length === 0 ? (
                <p className="text-sm text-muted">Ainda não está associado a nenhuma loja.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {shops.map((s) => (
                    <div key={s.shopId} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{s.shopName}</span>
                      <span className="text-muted">{s.distanceKm.toFixed(1)} km · {ASSOCIATION_STATUS_LABELS[s.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </CourierShell>
  );
}
