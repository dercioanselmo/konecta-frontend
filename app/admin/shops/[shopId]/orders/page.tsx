import { MerchantOrdersList } from "@/app/merchant/shops/[shopId]/orders/MerchantOrdersList";

export default async function AdminShopOrdersPage({ params }: PageProps<"/admin/shops/[shopId]/orders">) {
  const { shopId } = await params;
  return (
    <MerchantOrdersList shopId={shopId} hideStaff basePath="/admin/shops" listHref="/admin/shops" listLabel="Lojas" />
  );
}
