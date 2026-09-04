import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CartView } from "./CartView";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cart");

  return <CartView />;
}
