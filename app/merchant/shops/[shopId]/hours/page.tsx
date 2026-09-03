import { getCurrentUser } from "@/lib/auth/session";
import { HoursForm } from "./HoursForm";

export default async function ShopHoursPage({ params }: PageProps<"/merchant/shops/[shopId]/hours">) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  return <HoursForm shopId={shopId} isReadOnly={user?.role === "MERCHANT_STAFF"} />;
}
