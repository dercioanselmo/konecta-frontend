import { getValidAccessToken } from "@/lib/auth/session";
import { ordersApiFetch, OrdersServiceError } from "@/lib/orders/ordersApi";
import { OrderReceipt } from "@/components/orders/OrderReceipt";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";

export default async function ShopOrderReceiptPage({
  params,
}: PageProps<"/merchant/shops/[shopId]/orders/[orderId]/receipt">) {
  const { shopId, orderId } = await params;
  const accessToken = await getValidAccessToken();

  let order: MerchantOrder | null = null;
  let loadError: string | null = null;
  if (accessToken) {
    try {
      order = await ordersApiFetch<MerchantOrder>(`/api/v1/merchant/shops/${shopId}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      loadError = err instanceof OrdersServiceError ? err.message : "Não foi possível carregar a encomenda.";
    }
  }

  if (loadError || !order) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
        <p className="text-sm text-red-500">{loadError ?? "Encomenda não encontrada."}</p>
      </div>
    );
  }

  return <OrderReceipt order={order} backHref={`/merchant/shops/${shopId}/orders/${orderId}`} />;
}
