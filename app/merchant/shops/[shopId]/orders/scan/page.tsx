import { getCurrentUser } from "@/lib/auth/session";
import { ScanOrderView } from "./ScanOrderView";

export default async function ShopOrderScanPage({ params }: PageProps<"/merchant/shops/[shopId]/orders/scan">) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  return <ScanOrderView shopId={shopId} hideStaff={user?.role === "MERCHANT_STAFF"} />;
}
