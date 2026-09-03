import { ProductDetailView } from "@/app/merchant/shops/[shopId]/products/[productId]/ProductDetailView";

export default async function AdminProductDetailPage({
  params,
}: PageProps<"/admin/shops/[shopId]/products/[productId]">) {
  const { shopId, productId } = await params;
  return <ProductDetailView shopId={shopId} productId={productId} basePath="/admin/shops" />;
}
