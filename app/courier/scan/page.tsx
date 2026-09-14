import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword, isPendingCourierApplicant } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { CourierShell } from "@/components/courier/CourierShell";
import { CourierScanView } from "./CourierScanView";

export default async function CourierScanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier/scan");
  if (!isProfileComplete(user) && user.role !== "COURIER") redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  if (isPendingCourierApplicant(user)) redirect("/courier/onboarding");
  if (user.role !== "COURIER") redirect(roleHomePath(user.role));

  return (
    <CourierShell user={user}>
      <CourierScanView />
    </CourierShell>
  );
}
