"use client";

import { useCallback, useEffect, useState } from "react";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Button } from "@/components/ui/Button";
import { getShop, getHours, setHours } from "@/lib/stores/client";
import { WEEKDAYS } from "@/lib/stores/types";
import { WEEKDAY_LABELS } from "@/lib/stores/dayLabels";
import { ClientApiError } from "@/lib/auth/client";
import type { OpeningHoursDay } from "@/lib/stores/types";

function defaultDays(): OpeningHoursDay[] {
  return WEEKDAYS.map((day) => ({ day, opensAt: "08:00", closesAt: "18:00", closed: false }));
}

// The API returns times as HH:mm:ss (e.g. "08:00:00"); <input type="time">
// without a seconds step only accepts HH:mm, so trim before displaying.
function toInputTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : value;
}

function normalizeDays(days: OpeningHoursDay[]): OpeningHoursDay[] {
  return days.map((d) => ({ ...d, opensAt: toInputTime(d.opensAt), closesAt: toInputTime(d.closesAt) }));
}

interface HoursFormProps {
  shopId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

export function HoursForm({
  shopId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: HoursFormProps) {
  const [shopName, setShopName] = useState("Loja");
  const [days, setDays] = useState<OpeningHoursDay[]>(defaultDays());
  const [hasSavedHours, setHasSavedHours] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [shop, hours] = await Promise.all([getShop(shopId), getHours(shopId)]);
      setShopName(shop.name);
      const savedAlready = hours.days?.length === 7;
      setHasSavedHours(savedAlready);
      if (savedAlready) setDays(normalizeDays(hours.days));
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar o horário.");
    }
  }, [shopId]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const updateDay = (index: number, patch: Partial<OpeningHoursDay>) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const result = await setHours(shopId, { days });
      setDays(normalizeDays(result.days));
      setHasSavedHours(true);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ClientApiError ? err.details?.join(" ") ?? err.message : "Não foi possível guardar o horário.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <ShopNav shopId={shopId} shopName={shopName} hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />
        <p className="text-sm text-red-500">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName={shopName} hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-3">
        {!hasSavedHours ? (
          <p className="rounded-xl bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
            Esta loja ainda não tem horário guardado — a loja aparece como fechada até guardar. Os
            valores abaixo são apenas uma sugestão; reveja-os e clique em &quot;Guardar horário&quot;.
          </p>
        ) : null}
        {days.map((d, i) => (
          <div key={d.day} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <span className="w-32 text-sm font-medium text-foreground">{WEEKDAY_LABELS[d.day]}</span>
            <label className="flex items-center gap-1.5 text-sm text-muted">
              <input
                type="checkbox"
                checked={d.closed}
                onChange={(e) => updateDay(i, { closed: e.target.checked })}
              />
              Fechado
            </label>
            {!d.closed ? (
              <>
                <input
                  type="time"
                  value={d.opensAt ?? ""}
                  onChange={(e) => updateDay(i, { opensAt: e.target.value })}
                  className="h-10 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                />
                <span className="text-sm text-muted">até</span>
                <input
                  type="time"
                  value={d.closesAt ?? ""}
                  onChange={(e) => updateDay(i, { closesAt: e.target.value })}
                  className="h-10 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                />
              </>
            ) : null}
          </div>
        ))}

        {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
        {saved ? <p className="text-sm text-brand-green">Horário guardado.</p> : null}

        <Button type="submit" loading={saving} className="mt-2 w-auto px-6">
            Guardar horário
          </Button>
      </form>
    </div>
  );
}
