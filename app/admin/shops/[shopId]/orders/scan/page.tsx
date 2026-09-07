import { ScanOrderView } from "@/app/merchant/shops/[shopId]/orders/scan/ScanOrderView";

export default async function AdminShopOrderScanPage({
  params,
  searchParams,
}: PageProps<"/admin/shops/[shopId]/orders/scan">) {
  const { shopId } = await params;
  const query = await searchParams;
  const expectedOrderId = Array.isArray(query.expectedOrderId) ? query.expectedOrderId[0] : query.expectedOrderId;
  return (
    <ScanOrderView
      shopId={shopId}
      hideStaff
      basePath="/admin/shops"
      listHref="/admin/shops"
      listLabel="Lojas"
      expectedOrderId={expectedOrderId}
    />
  );
}
