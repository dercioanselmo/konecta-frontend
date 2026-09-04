import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";

// `/home` is now the public storefront (browsable without login) — this
// route is just the entry redirect: straight to /home for a visitor, or
// to the right shell/onboarding step for an authenticated user.
export default async function SplashPage() {
  const user = await getCurrentUser();
  redirect(user ? (isProfileComplete(user) ? roleHomePath(user.role) : "/complete-profile") : "/home");
}
