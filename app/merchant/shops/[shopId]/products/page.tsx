import { ProductsList } from "./ProductsList";

export default async function ShopProductsPage({ params }: PageProps<"/merchant/shops/[shopId]/products">) {
  const { shopId } = await params;
  return <ProductsList shopId={shopId} />;
}
