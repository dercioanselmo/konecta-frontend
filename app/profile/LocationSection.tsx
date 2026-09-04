"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LocationPicker, MAPUTO_DEFAULT } from "@/components/customer/LocationPicker";
import { setUserLocation, ClientApiError } from "@/lib/auth/client";
import type { UserProfile } from "@/lib/auth/types";

/**
 * Standalone location picker with its own save button — used only by the
 * category-browsing "set your location" gate (`/categories/{id}/set-location`),
 * a dedicated micro-flow where saving immediately and moving on makes sense.
 * The profile page uses `LocationPicker` directly instead, folded into its
 * own single "Guardar alterações" submit — see ProfileForm.tsx.
 */
export function LocationSection({ user, onSaved }: { user: UserProfile; onSaved: (user: UserProfile) => void }) {
  const [position, setPosition] = useState<[number, number]>(
    user.latitude != null && user.longitude != null ? [user.latitude, user.longitude] : MAPUTO_DEFAULT,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const [latitude, longitude] = position;
      const updated = await setUserLocation(latitude, longitude);
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ClientApiError
          ? (err.details?.join(" ") ?? err.message)
          : "Não foi possível guardar a localização.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Localização</h2>
        <p className="text-sm text-muted">Usada para mostrar lojas e produtos mais próximos de si.</p>
      </div>

      <LocationPicker latitude={position[0]} longitude={position[1]} onChange={(lat, lng) => setPosition([lat, lng])} />

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {saved ? <p className="text-sm text-brand-green">Localização guardada com sucesso.</p> : null}

      <Button type="button" className="w-auto px-6" loading={saving} onClick={handleSave}>
        Guardar localização
      </Button>
    </div>
  );
}
