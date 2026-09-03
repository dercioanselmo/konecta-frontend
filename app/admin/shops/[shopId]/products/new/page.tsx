import { NewProductForm } from "@/app/merchant/shops/[shopId]/products/new/NewProductForm";

export default async function AdminNewProductPage({ params }: PageProps<"/admin/shops/[shopId]/products/new">) {
  const { shopId } = await params;
  return <NewProductForm shopId={shopId} basePath="/admin/shops" />;
}
