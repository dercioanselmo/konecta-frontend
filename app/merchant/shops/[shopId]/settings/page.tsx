import { ShopSettingsForm } from "./ShopSettingsForm";

export default async function ShopSettingsPage({ params }: PageProps<"/merchant/shops/[shopId]/settings">) {
  const { shopId } = await params;
  return <ShopSettingsForm shopId={shopId} />;
}
