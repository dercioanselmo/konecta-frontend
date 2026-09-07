import { getCurrentUser } from "@/lib/auth/session";
import { ScanOrderView } from "./ScanOrderView";

export default async function ShopOrderScanPage({
  params,
  searchParams,
}: PageProps<"/merchant/shops/[shopId]/orders/scan">) {
  const { shopId } = await params;
  const query = await searchParams;
  const expectedOrderId = Array.isArray(query.expectedOrderId) ? query.expectedOrderId[0] : query.expectedOrderId;
  const user = await getCurrentUser();
  return <ScanOrderView shopId={shopId} hideStaff={user?.role === "MERCHANT_STAFF"} expectedOrderId={expectedOrderId} />;
}
