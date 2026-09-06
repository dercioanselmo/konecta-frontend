import { MerchantOrderDetailView } from "@/app/merchant/shops/[shopId]/orders/[orderId]/MerchantOrderDetailView";

export default async function AdminShopOrderDetailPage({ params }: PageProps<"/admin/shops/[shopId]/orders/[orderId]">) {
  const { shopId, orderId } = await params;
  return (
    <MerchantOrderDetailView
      shopId={shopId}
      orderId={orderId}
      hideStaff
      basePath="/admin/shops"
      listHref="/admin/shops"
      listLabel="Lojas"
    />
  );
}
