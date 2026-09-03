import { StaffDetailView } from "@/app/merchant/shops/[shopId]/staff/[staffId]/StaffDetailView";

export default async function AdminStaffDetailPage({
  params,
}: PageProps<"/admin/shops/[shopId]/staff/[staffId]">) {
  const { shopId, staffId } = await params;
  return (
    <StaffDetailView shopId={shopId} staffId={staffId} basePath="/admin/shops" listHref="/admin/shops" listLabel="Lojas" />
  );
}
