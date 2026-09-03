import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { StaffList } from "./StaffList";

export default async function StaffPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  if (user?.role === "MERCHANT_STAFF") redirect(`/merchant/shops/${shopId}`);
  return <StaffList shopId={shopId} />;
}
