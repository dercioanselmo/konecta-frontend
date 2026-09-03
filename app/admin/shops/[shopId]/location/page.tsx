import { LocationForm } from "@/app/merchant/shops/[shopId]/location/LocationForm";

export default async function AdminShopLocationPage({ params }: PageProps<"/admin/shops/[shopId]/location">) {
  const { shopId } = await params;
  return <LocationForm shopId={shopId} basePath="/admin/shops" listHref="/admin/shops" listLabel="Lojas" />;
}
