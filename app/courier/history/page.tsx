import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword, isPendingCourierApplicant } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { CourierShell } from "@/components/courier/CourierShell";
import { CourierHistoryView } from "./CourierHistoryView";

export default async function CourierHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier/history");
  if (!isProfileComplete(user) && user.role !== "COURIER") redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  if (isPendingCourierApplicant(user)) redirect("/courier/onboarding");
  if (user.role !== "COURIER") redirect(roleHomePath(user.role));

  return (
    <CourierShell user={user}>
      <CourierHistoryView />
    </CourierShell>
  );
}
