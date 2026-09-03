import { StaffList } from "@/app/merchant/shops/[shopId]/staff/StaffList";

export default async function AdminShopStaffPage({ params }: PageProps<"/admin/shops/[shopId]/staff">) {
  const { shopId } = await params;
  return (
    <StaffList
      shopId={shopId}
      basePath="/admin/shops"
      listHref="/admin/shops"
      listLabel="Lojas"
      allowCreate={false}
    />
  );
}
