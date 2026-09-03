import { getCurrentUser } from "@/lib/auth/session";
import { ShopSettingsForm } from "./ShopSettingsForm";

export default async function ShopSettingsPage({ params }: PageProps<"/merchant/shops/[shopId]/settings">) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  return <ShopSettingsForm shopId={shopId} hideStaff={user?.role === "MERCHANT_STAFF"} />;
}
