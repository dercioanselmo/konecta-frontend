import { ScanQrFab } from "@/components/merchant/ScanQrFab";

export default async function ShopLayout({ children, params }: LayoutProps<"/merchant/shops/[shopId]">) {
  const { shopId } = await params;
  return (
    <>
      {children}
      <ScanQrFab shopId={shopId} basePath="/merchant/shops" />
    </>
  );
}
