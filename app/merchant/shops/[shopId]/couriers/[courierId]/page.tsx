import { getCurrentUser } from "@/lib/auth/session";
import { CourierDetailView } from "./CourierDetailView";

export default async function ShopCourierDetailPage({
  params,
}: PageProps<"/merchant/shops/[shopId]/couriers/[courierId]">) {
  const { shopId, courierId } = await params;
  const user = await getCurrentUser();
  return <CourierDetailView shopId={shopId} courierId={courierId} hideStaff={user?.role === "MERCHANT_STAFF"} />;
}
