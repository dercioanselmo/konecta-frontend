import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword, isPendingCourierApplicant } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { CourierShell } from "@/components/courier/CourierShell";
import { CourierOnboardingForm } from "./CourierOnboardingForm";

export default async function CourierOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier/onboarding");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  // Reachable by an already-approved courier (editing their profile later)
  // *and* by a pending applicant completing it before approval — see
  // isPendingCourierApplicant's doc comment for why the latter matters.
  const pending = isPendingCourierApplicant(user);
  if (user.role !== "COURIER" && !pending) redirect(roleHomePath(user.role));

  return (
    <CourierShell user={user}>
      <CourierOnboardingForm user={user} pendingApproval={pending} />
    </CourierShell>
  );
}
