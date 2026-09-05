import { redirect } from "next/navigation";
import { getCurrentUser, getValidAccessToken } from "@/lib/auth/session";
import { authApiFetch } from "@/lib/auth/authApi";
import type { UserPreferences } from "@/lib/auth/types";
import { CheckoutView } from "./CheckoutView";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  let preferences: UserPreferences = { deliveryPreference: null, paymentMethod: null };
  const accessToken = await getValidAccessToken();
  if (accessToken) {
    try {
      preferences = await authApiFetch<UserPreferences>("/api/v1/users/me/preferences", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // Fall back to the empty shape — the screen still works, just starts unset.
    }
  }

  return <CheckoutView user={user} preferences={preferences} />;
}
