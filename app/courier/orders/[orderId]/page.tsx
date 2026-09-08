import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { CourierShell } from "@/components/courier/CourierShell";
import { CourierOrderDetailView } from "./CourierOrderDetailView";

export default async function CourierOrderPage({ params }: PageProps<"/courier/orders/[orderId]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/courier");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  if (user.role !== "COURIER") redirect(roleHomePath(user.role));
  const { orderId } = await params;
  return <CourierShell user={user}><CourierOrderDetailView orderId={orderId} /></CourierShell>;
}