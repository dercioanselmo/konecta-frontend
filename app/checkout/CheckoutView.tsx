"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { LocationPicker, MAPUTO_DEFAULT } from "@/components/customer/LocationPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCart } from "@/lib/cart/useCart";
import { saveCheckoutDraft } from "@/lib/cart/client";
import { placeOrder, CheckoutApiError } from "@/lib/checkout/client";
import { fetchNeighborhoods } from "@/lib/auth/client";
import type { UserPreferences, UserProfile } from "@/lib/auth/types";
import type { DeliveryMode } from "@/lib/checkout/types";
import type { Neighborhood } from "@/lib/auth/types";

const DELIVERY_OPTIONS: { value: DeliveryMode; label: string }[] = [
  { value: "DELIVERY", label: "Receber" },
  { value: "PICKUP", label: "Levantar na loja" },
];

const PAYMENT_OPTIONS: { value: NonNullable<UserPreferences["paymentMethod"]>; label: string }[] = [
  { value: "CARD", label: "Cartão" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "EMOLA", label: "e-Mola" },
  { value: "CASH", label: "Dinheiro vivo na entrega ou levantamento" },
];

/**
 * `DeliveryPreference` (the profile setting, Round 17) and `DeliveryMode`
 * (checkout's own vocabulary) deliberately use different values —
 * AGENTS.md's Checkout section anticipates this exact mismatch ("names
 * may vary — map in client").
 */
function deliveryModeFromPreference(pref: UserPreferences["deliveryPreference"]): DeliveryMode {
  return pref === "PICKUP" ? "PICKUP" : "DELIVERY";
}

export function CheckoutView({ user, preferences, storeId }: { user: UserProfile; preferences: UserPreferences; storeId: string }) {
  const router = useRouter();
  const { cart, isLoading: cartLoading, refresh: refreshCart } = useCart(storeId);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    deliveryModeFromPreference(preferences.deliveryPreference),
  );
  const [address, setAddress] = useState(user.address ?? "");
  const [neighborhood, setNeighborhood] = useState(user.neighborhood ?? "");
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [position, setPosition] = useState<[number, number]>(
    user.latitude != null && user.longitude != null ? [user.latitude, user.longitude] : MAPUTO_DEFAULT,
  );
  const [paymentMethod, setPaymentMethod] = useState<NonNullable<UserPreferences["paymentMethod"]>>(
    preferences.paymentMethod ?? "CASH",
  );
  const [contactEmail, setContactEmail] = useState(user.email ?? "");
  const [contactPhone, setContactPhone] = useState(user.phone ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  // Generated once per checkout attempt; resent unchanged if the same
  // submit is retried, so a network hiccup can't create a duplicate order.
  const idempotencyKey = useRef(crypto.randomUUID());

  // The fetched draft is the server-owned source of truth when resuming checkout.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchNeighborhoods("Maputo").then(setNeighborhoods);
  }, []);

  useEffect(() => {
    if (!cartLoading && cart.items.length === 0) {
      router.replace("/cart");
    }
  }, [cartLoading, cart.items.length, router]);

  useEffect(() => {
    if (cartLoading || draftLoaded || !cart) return;
    if (cart.checkoutDraft) {
      const draft = cart.checkoutDraft;
      setDeliveryMode(draft.deliveryMode);
      setAddress(draft.deliveryAddress?.address ?? "");
      setNeighborhood(draft.deliveryAddress?.neighborhood ?? "");
      if (draft.deliveryAddress) setPosition([draft.deliveryAddress.latitude, draft.deliveryAddress.longitude]);
      setPaymentMethod(draft.paymentMethod);
      setContactEmail(draft.contactEmail);
      setContactPhone(draft.contactPhone);
    }
    setDraftLoaded(true);
  }, [cart, cartLoading, draftLoaded]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const subtotalKnown = cart.subtotal != null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (deliveryMode === "DELIVERY" && (!address.trim() || !neighborhood)) {
      setFormError("Indique o endereço e o bairro para entrega.");
      return;
    }
    if (!contactEmail.trim() || !contactPhone.trim()) {
      setFormError("Indique um email e telefone de contacto.");
      return;
    }

    setSubmitting(true);
    const deliveryAddress =
      deliveryMode === "DELIVERY"
        ? { address, city: "Maputo", neighborhood, latitude: position[0], longitude: position[1] }
        : null;
    try {
      if (!cart.isStoreOpen) {
        await saveCheckoutDraft(storeId, { deliveryMode, deliveryAddress, paymentMethod, contactEmail, contactPhone });
        await refreshCart();
        setDraftSaved(true);
        setSubmitting(false);
        return;
      }
      const order = await placeOrder(
        {
          storeId,
          deliveryMode,
          deliveryAddress,
          paymentMethod,
          contactEmail,
          contactPhone,
        },
        idempotencyKey.current,
      );
      router.push(`/orders/${order.orderId}`);
    } catch (err) {
      setFormError(
        err instanceof CheckoutApiError && err.code === "STORE_CLOSED"
          ? "A loja fechou entretanto. Os seus dados foram guardados neste carrinho."
          : err instanceof CheckoutApiError
            ? (err.details?.join(" ") ?? err.message)
          : "Não foi possível finalizar a compra. Tente novamente.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
      <CustomerHeader user={user} backHref={`/cart?storeId=${storeId}`} backLabel="← Carrinho" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">Finalizar compra</h1>

      {cartLoading || cart.items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">A carregar…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-8">
          {!cart.isStoreOpen ? <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">A loja está fechada. Pode preencher os dados agora; serão guardados neste carrinho e poderá concluir quando a loja abrir.</div> : null}
          {draftSaved ? <div className="rounded-xl border border-brand-green/40 bg-brand-green/10 p-3 text-sm text-brand-green">Dados guardados neste carrinho.</div> : null}

          {/* A. Entrega */}
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold text-foreground">Entrega</h2>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeliveryMode(opt.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    deliveryMode === opt.value
                      ? "border-brand-green bg-brand-green/10 text-brand-green"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {deliveryMode === "DELIVERY" ? (
              <div className="flex flex-col gap-3">
                <Input label="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
                <Select label="Bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
                  <option value="" disabled>
                    Selecione o bairro
                  </option>
                  {neighborhoods.map((n) => (
                    <option key={n.name} value={n.name}>
                      {n.name}
                    </option>
                  ))}
                </Select>
                <LocationPicker
                  latitude={position[0]}
                  longitude={position[1]}
                  onChange={(lat, lng) => setPosition([lat, lng])}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                {cart.storeLogoUrl ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
                    <Image src={cart.storeLogoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                  </div>
                ) : null}
                <p className="text-sm text-foreground">
                  Levantar em <span className="font-semibold">{cart.storeName ?? "Loja"}</span>
                </p>
              </div>
            )}
          </section>

          {/* B. Pagamento */}
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold text-foreground">Pagamento</h2>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    paymentMethod === opt.value
                      ? "border-brand-green bg-brand-green/10 text-brand-green"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {paymentMethod === "CASH" ? (
              <p className="text-xs text-muted">Pagamento na entrega ou levantamento.</p>
            ) : null}
          </section>

          {/* C. Contactos e resumo */}
          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold text-foreground">Contactos e resumo</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <Input
                label="Telefone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="text-muted">{item.lineTotal != null ? `${item.lineTotal.toFixed(2)} MT` : "—"}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium text-foreground">
                  {subtotalKnown ? `${cart.subtotal!.toFixed(2)} MT` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Taxa de entrega</span>
                <span className="text-muted">Calculada na confirmação</span>
              </div>
            </div>

            {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

            <Button type="submit" loading={submitting} className="w-full">
              {cart.isStoreOpen ? "Confirmar e pagar" : "Guardar neste carrinho"}
            </Button>
          </section>
        </form>
      )}
    </div>
  );
}
