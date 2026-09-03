import { ProductDetailView } from "./ProductDetailView";

export default async function ProductDetailPage({
  params,
}: PageProps<"/merchant/shops/[shopId]/products/[productId]">) {
  const { shopId, productId } = await params;
  return <ProductDetailView shopId={shopId} productId={productId} />;
}
