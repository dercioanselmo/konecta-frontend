import Image from "next/image";
import { redirect } from "next/navigation";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { checkoutApiFetch, CheckoutServiceError } from "@/lib/checkout/checkoutApi";
import { getValidAccessToken, getCurrentUser } from "@/lib/auth/session";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { Order } from "@/lib/checkout/types";

export default async function OrderDetailPage({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${orderId}`);

  const accessToken = await getValidAccessToken();

  let order: Order | null = null;
  let loadError: string | null = null;
  if (accessToken) {
    try {
      order = await checkoutApiFetch<Order>(`/api/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      loadError = err instanceof CheckoutServiceError ? err.message : "Não foi possível carregar a encomenda.";
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
      <CustomerHeader user={user} backHref="/home" backLabel="← Categorias" />

      {loadError || !order ? (
        <p className="mt-6 text-sm text-red-500">{loadError ?? "Encomenda não encontrada."}</p>
      ) : (
        <main className="mt-6 flex flex-1 flex-col gap-6">
          <div>
            <p className="text-sm text-muted">Encomenda</p>
            <h1 className="text-xl font-bold text-foreground">#{order.orderId.slice(0, 8)}</h1>
            <span className="mt-1 inline-flex w-fit rounded-full bg-brand-green/10 px-3 py-1 text-sm font-medium text-brand-green">
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            {order.storeLogoUrl ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                <Image src={order.storeLogoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
              </div>
            ) : null}
            <div>
              <p className="font-semibold text-foreground">{order.storeName}</p>
              <p className="text-sm text-muted">
                {order.deliveryMode === "PICKUP" ? "Levantar na loja" : "Receber em casa"} ·{" "}
                {order.paymentMethod === "CARD"
                  ? "Cartão"
                  : order.paymentMethod === "MPESA"
                    ? "M-Pesa"
                    : order.paymentMethod === "EMOLA"
                      ? "e-Mola"
                      : "Dinheiro vivo"}
              </p>
            </div>
          </div>

          {order.deliveryAddress ? (
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
              <p className="font-medium text-foreground">Endereço de entrega</p>
              <p className="mt-1 text-muted">
                {order.deliveryAddress.address}, {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-base font-semibold text-foreground">Resumo</h2>
            <div className="flex flex-col gap-1.5 border-b border-border pb-3">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="text-muted">{item.lineTotal.toFixed(2)} MT</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1 pt-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="text-foreground">{order.subtotal.toFixed(2)} MT</span>
              </div>
              {order.deliveryFee != null ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted">Taxa de entrega</span>
                  <span className="text-foreground">{order.deliveryFee.toFixed(2)} MT</span>
                </div>
              ) : null}
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{order.total.toFixed(2)} MT</span>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
