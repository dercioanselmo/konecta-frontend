import { getCurrentUser } from "@/lib/auth/session";
import { MerchantOrderDetailView } from "./MerchantOrderDetailView";

export default async function ShopOrderDetailPage({ params }: PageProps<"/merchant/shops/[shopId]/orders/[orderId]">) {
  const { shopId, orderId } = await params;
  const user = await getCurrentUser();
  return <MerchantOrderDetailView shopId={shopId} orderId={orderId} hideStaff={user?.role === "MERCHANT_STAFF"} />;
}
