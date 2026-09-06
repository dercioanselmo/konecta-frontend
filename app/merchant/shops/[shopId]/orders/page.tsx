import { getCurrentUser } from "@/lib/auth/session";
import { MerchantOrdersList } from "./MerchantOrdersList";

export default async function ShopOrdersPage({ params }: PageProps<"/merchant/shops/[shopId]/orders">) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  return <MerchantOrdersList shopId={shopId} hideStaff={user?.role === "MERCHANT_STAFF"} />;
}
