import { StaffList } from "./StaffList";

export default async function StaffPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  return <StaffList shopId={shopId} />;
}
