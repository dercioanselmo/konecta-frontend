import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { OrdersHubView } from "./OrdersHubView";

export default async function OrdersHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");

  return <OrdersHubView user={user} />;
}
