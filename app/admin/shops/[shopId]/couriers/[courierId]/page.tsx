import { CourierDetailView } from "@/app/merchant/shops/[shopId]/couriers/[courierId]/CourierDetailView";

export default async function AdminShopCourierDetailPage({
  params,
}: PageProps<"/admin/shops/[shopId]/couriers/[courierId]">) {
  const { shopId, courierId } = await params;
  return (
    <CourierDetailView
      shopId={shopId}
      courierId={courierId}
      hideStaff
      basePath="/admin/shops"
      listHref="/admin/shops"
      listLabel="Lojas"
    />
  );
}
