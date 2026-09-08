import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword, isPendingCourierApplicant } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { CourierShell } from "@/components/courier/CourierShell";
import { CourierStoresView } from "./CourierStoresView";

export default async function CourierStoresPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier/stores");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  // A pending applicant can request store associations too — approval is
  // per store, independent of the platform-level admin approval, and a
  // store approving them is what actually matters operationally (see
  // isPendingCourierApplicant's doc comment).
  if (user.role !== "COURIER" && !isPendingCourierApplicant(user)) redirect(roleHomePath(user.role));

  return (
    <CourierShell user={user}>
      <CourierStoresView />
    </CourierShell>
  );
}
