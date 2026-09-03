import { HoursForm } from "./HoursForm";

export default async function ShopHoursPage({ params }: PageProps<"/merchant/shops/[shopId]/hours">) {
  const { shopId } = await params;
  return <HoursForm shopId={shopId} />;
}
