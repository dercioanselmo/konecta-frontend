import { getCurrentUser } from "@/lib/auth/session";
import { CouriersList } from "./CouriersList";

export default async function ShopCouriersPage({ params }: PageProps<"/merchant/shops/[shopId]/couriers">) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  return <CouriersList shopId={shopId} hideStaff={user?.role === "MERCHANT_STAFF"} />;
}
