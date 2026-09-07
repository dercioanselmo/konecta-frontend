"use client";

import { useEffect } from "react";

/**
 * Pre-pins the map with the device's real GPS position instead of the
 * static Maputo default, wherever a location picker first loads without
 * an already-saved coordinate to show. Runs once on mount; if the
 * browser has no geolocation support, the user denies the permission
 * prompt, or the lookup times out, this is a silent no-op — the Maputo
 * default the caller already set stays in place, and the user can still
 * drag the pin or search an address manually.
 *
 * Never called when a real saved location already exists (`hasSavedLocation`)
 * — reopening a screen that already has a stored address shouldn't
 * silently jump the pin to wherever the user happens to be right now.
 */
export function useDeviceLocationDefault(hasSavedLocation: boolean, onLocated: (lat: number, lng: number) => void) {
  useEffect(() => {
    if (hasSavedLocation) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onLocated(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Denied, unavailable, or timed out — the Maputo default already
        // rendered stands, and the user can still move the pin themselves.
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only, using the initial hasSavedLocation/onLocated
  }, []);
}
