import { getCurrentUser } from "@/lib/auth/session";
import { ProductsList } from "./ProductsList";

export default async function ShopProductsPage({ params }: PageProps<"/merchant/shops/[shopId]/products">) {
  const { shopId } = await params;
  const user = await getCurrentUser();
  return <ProductsList shopId={shopId} hideStaff={user?.role === "MERCHANT_STAFF"} />;
}
