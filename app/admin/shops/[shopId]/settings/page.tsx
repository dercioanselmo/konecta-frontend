import { ShopSettingsForm } from "@/app/merchant/shops/[shopId]/settings/ShopSettingsForm";

export default async function AdminShopSettingsPage({ params }: PageProps<"/admin/shops/[shopId]/settings">) {
  const { shopId } = await params;
  return (
    <ShopSettingsForm
      shopId={shopId}
      basePath="/admin/shops"
      listHref="/admin/shops"
      listLabel="Lojas"
    />
  );
}
