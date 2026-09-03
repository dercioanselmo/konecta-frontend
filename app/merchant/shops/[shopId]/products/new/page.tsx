import { NewProductForm } from "./NewProductForm";

export default async function NewProductPage({ params }: PageProps<"/merchant/shops/[shopId]/products/new">) {
  const { shopId } = await params;
  return <NewProductForm shopId={shopId} />;
}
