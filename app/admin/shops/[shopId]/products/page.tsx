import { ProductsList } from "@/app/merchant/shops/[shopId]/products/ProductsList";

export default async function AdminShopProductsPage({ params }: PageProps<"/admin/shops/[shopId]/products">) {
  const { shopId } = await params;
  return (
    <ProductsList shopId={shopId} hideStaff basePath="/admin/shops" listHref="/admin/shops" listLabel="Lojas" />
  );
}
