import { getCurrentUser } from "@/lib/auth/session";
import { LocationForm } from "./LocationForm";

export default async function ShopLocationPage({ params }: PageProps<"/merchant/shops/[shopId]/location">) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  return <LocationForm shopId={shopId} hideStaff={user?.role === "MERCHANT_STAFF"} />;
}
