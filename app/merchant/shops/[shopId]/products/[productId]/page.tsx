import { getCurrentUser } from "@/lib/auth/session";
import { ProductDetailView } from "./ProductDetailView";

export default async function ProductDetailPage({
  params,
}: PageProps<"/merchant/shops/[shopId]/products/[productId]">) {
  const { shopId, productId } = await params;
  const user = await getCurrentUser();
  return <ProductDetailView shopId={shopId} productId={productId} isReadOnly={user?.role === "MERCHANT_STAFF"} />;
}
