import { getCurrentUser } from "@/lib/auth/session";
import { StaffList } from "./StaffList";

export default async function StaffPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  return <StaffList shopId={shopId} isReadOnly={user?.role === "MERCHANT_STAFF"} />;
}
