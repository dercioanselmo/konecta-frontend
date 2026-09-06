import { redirect } from "next/navigation";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { ordersApiFetch, OrdersServiceError } from "@/lib/orders/ordersApi";
import { getValidAccessToken, getCurrentUser } from "@/lib/auth/session";
import type { Order } from "@/lib/checkout/types";
import { OrderDetailView } from "./OrderDetailView";

export default async function OrderDetailPage({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${orderId}`);

  const accessToken = await getValidAccessToken();

  let order: Order | null = null;
  let loadError: string | null = null;
  if (accessToken) {
    try {
      order = await ordersApiFetch<Order>(`/api/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      loadError = err instanceof OrdersServiceError ? err.message : "Não foi possível carregar a encomenda.";
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
      <CustomerHeader user={user} backHref="/orders" backLabel="← Encomendas" />

      {loadError || !order ? (
        <p className="mt-6 text-sm text-red-500">{loadError ?? "Encomenda não encontrada."}</p>
      ) : (
        <OrderDetailView orderId={orderId} initialOrder={order} />
      )}
    </div>
  );
}
