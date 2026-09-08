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
  // Pending courier applicants must be able to request store associations;
  // those requests are what give each store something to approve.
  const pending = isPendingCourierApplicant(user);
  if (user.role !== "COURIER" && !pending) redirect(roleHomePath(user.role));

  return (
    <CourierShell user={user}>
      <CourierStoresView />
    </CourierShell>
  );
}
