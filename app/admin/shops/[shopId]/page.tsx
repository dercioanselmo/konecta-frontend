import { ShopDashboard } from "@/components/merchant/ShopDashboard";

export default async function AdminShopDashboardPage({ params }: PageProps<"/admin/shops/[shopId]">) {
  const { shopId } = await params;
  return <ShopDashboard shopId={shopId} basePath="/admin/shops" listHref="/admin/shops" listLabel="Lojas" />;
}
