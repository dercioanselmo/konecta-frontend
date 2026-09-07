import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword } from "@/lib/auth/profile";
import { CourierShell } from "@/components/courier/CourierShell";
import { CourierOnboardingForm } from "./CourierOnboardingForm";

export default async function CourierOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier/onboarding");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  if (user.role !== "COURIER") redirect("/courier");

  return (
    <CourierShell user={user}>
      <CourierOnboardingForm user={user} />
    </CourierShell>
  );
}
