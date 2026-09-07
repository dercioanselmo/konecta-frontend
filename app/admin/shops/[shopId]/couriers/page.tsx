import { CouriersList } from "@/app/merchant/shops/[shopId]/couriers/CouriersList";

export default async function AdminShopCouriersPage({ params }: PageProps<"/admin/shops/[shopId]/couriers">) {
  const { shopId } = await params;
  return (
    <CouriersList shopId={shopId} hideStaff basePath="/admin/shops" listHref="/admin/shops" listLabel="Lojas" />
  );
}
