import { ScanOrderView } from "@/app/merchant/shops/[shopId]/orders/scan/ScanOrderView";

export default async function AdminShopOrderScanPage({ params }: PageProps<"/admin/shops/[shopId]/orders/scan">) {
  const { shopId } = await params;
  return (
    <ScanOrderView shopId={shopId} hideStaff basePath="/admin/shops" listHref="/admin/shops" listLabel="Lojas" />
  );
}
