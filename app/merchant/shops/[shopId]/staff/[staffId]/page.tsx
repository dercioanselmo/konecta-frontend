import { StaffDetailView } from "./StaffDetailView";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ shopId: string; staffId: string }>;
}) {
  const { shopId, staffId } = await params;
  return <StaffDetailView shopId={shopId} staffId={staffId} />;
}
