"use client";

import { useEffect, useState } from "react";
import { getUserPreferences, setUserPreferences, ClientApiError } from "@/lib/auth/client";
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

export function PreferencesSection() {
  const [preferences, setLocalPreferences] = useState<UserPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      getUserPreferences()
        .then(setLocalPreferences)
        .catch((err) => {
          setLoadError(
            err instanceof ClientApiError ? err.message : "Não foi possível carregar as preferências.",
          );
        });
    });
  }, []);

  const save = async (next: UserPreferences) => {
    setLocalPreferences(next);
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await setUserPreferences(next);
      setLocalPreferences(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof ClientApiError
          ? (err.details?.join(" ") ?? err.message)
          : "Não foi possível guardar as preferências.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preferências de compra</h2>
        <p className="text-sm text-muted">
          Usadas como predefinição quando finalizar uma compra.
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : !preferences ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Entrega</span>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_OPTIONS.map((opt) => {
                const checked = preferences.deliveryPreference === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={saving}
                    onClick={() => save({ ...preferences, deliveryPreference: opt.value })}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
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
                const checked = preferences.paymentMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={saving}
                    onClick={() => save({ ...preferences, paymentMethod: opt.value })}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
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

          {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
          {saved ? <p className="text-sm text-brand-green">Preferências guardadas.</p> : null}
        </>
      )}
    </div>
  );
}
