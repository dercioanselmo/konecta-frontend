"use client";

import type { DeliveryPreference, PaymentMethod, UserPreferences } from "@/lib/auth/types";

const DELIVERY_OPTIONS: { value: DeliveryPreference; label: string }[] = [
  { value: "HOME_DELIVERY", label: "Receber em casa" },
  { value: "PICKUP", label: "Levantar na loja" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CARD", label: "Cartão" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "EMOLA", label: "e-Mola" },
  { value: "CASH", label: "Dinheiro vivo na entrega ou levantamento" },
];

/**
 * Pure, controlled preference picker — no save button, no API calls of its
 * own. Folded into the profile page's single "Guardar alterações" submit.
 */
export function PreferencesSection({
  value,
  onChange,
}: {
  value: UserPreferences;
  onChange: (next: UserPreferences) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preferências de compra</h2>
        <p className="text-sm text-muted">Usadas como predefinição quando finalizar uma compra.</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Entrega</span>
        <div className="flex flex-wrap gap-2">
          {DELIVERY_OPTIONS.map((opt) => {
            const checked = value.deliveryPreference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...value, deliveryPreference: opt.value })}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  checked
                    ? "border-brand-green bg-brand-green/10 text-brand-green"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Pagamento</span>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_OPTIONS.map((opt) => {
            const checked = value.paymentMethod === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...value, paymentMethod: opt.value })}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  checked
                    ? "border-brand-green bg-brand-green/10 text-brand-green"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
