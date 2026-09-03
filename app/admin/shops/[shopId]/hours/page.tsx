import { HoursForm } from "@/app/merchant/shops/[shopId]/hours/HoursForm";

export default async function AdminShopHoursPage({ params }: PageProps<"/admin/shops/[shopId]/hours">) {
  const { shopId } = await params;
  return (
    <HoursForm shopId={shopId} basePath="/admin/shops" listHref="/admin/shops" listLabel="Lojas" />
  );
}
