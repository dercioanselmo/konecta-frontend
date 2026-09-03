import { ShopDashboard } from "@/components/merchant/ShopDashboard";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ShopDashboardPage({ params }: PageProps<"/merchant/shops/[shopId]">) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  const hideStaff = user?.role === "MERCHANT_STAFF";

  return <ShopDashboard shopId={shopId} hideStaff={hideStaff} />;
}
