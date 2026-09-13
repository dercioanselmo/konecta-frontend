import { redirect } from "next/navigation";
import { getCurrentUser, getValidAccessToken } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword, isPendingCourierApplicant } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { ROLE_LABELS } from "@/lib/auth/roleLabels";
import { CourierShell } from "@/components/courier/CourierShell";
import { CourierOrdersDashboard } from "./CourierOrdersDashboard";
import { courierApiFetch, CourierServiceError } from "@/lib/courier/courierApi";
import type { CourierProfile, CourierShopAssociation } from "@/lib/courier/types";

export default async function CourierHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier");
  if (!isProfileComplete(user) && user.role !== "COURIER") redirect("/complete-profile");
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
      const [profileResult, shopsResult] = await Promise.allSettled([
        courierApiFetch<CourierProfile>("/api/v1/couriers/me", { headers }),
        courierApiFetch<CourierShopAssociation[]>("/api/v1/couriers/me/shops", { headers }),
      ]);
      if (profileResult.status === "fulfilled") profile = profileResult.value;
      if (shopsResult.status === "fulfilled") shops = shopsResult.value;

      const hasActiveShop = shops.some((shop) => shop.status === "ACTIVE");
      if (!profile && !hasActiveShop) {
        if (profileResult.status === "rejected" && profileResult.reason instanceof CourierServiceError && profileResult.reason.status === 404) {
          redirect("/courier/onboarding");
        }
        serviceUnavailable = true;
      }
    } catch {
      serviceUnavailable = true;
    }
  }

  return (
    <CourierShell user={user}>
      {user.status === "PENDING" && user.requestedRole ? (
        <p className="mb-4 rounded-xl bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          O seu pedido para se tornar {ROLE_LABELS[user.requestedRole]} está pendente de aprovação.
        </p>
      ) : null}
      {serviceUnavailable ? (
        <p className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
          Não foi possível carregar o seu perfil de entregador de momento.
        </p>
      ) : null}
      <CourierOrdersDashboard profileComplete={profile != null || shops.some((shop) => shop.status === "ACTIVE")} />
    </CourierShell>
  );
}
