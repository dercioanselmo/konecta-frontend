"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";

function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,0.4);border:2px solid #fff;">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const STORE_ICON = pinIcon("#059669", "L");
const DELIVERY_ICON = pinIcon("#2563eb", "E");
const COURIER_ICON = pinIcon("#d97706", "🛵");

interface Pin {
  latitude: number;
  longitude: number;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points, { padding: [32, 32] });
    }
    // Only re-fit when the actual coordinate set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);
  return null;
}

export default function OrderMapInner({
  store,
  delivery,
  courier,
}: {
  store: Pin | null;
  delivery: Pin | null;
  courier: Pin | null;
}) {
  const points: [number, number][] = [store, delivery, courier]
    .filter((p): p is Pin => p != null)
    .map((p) => [p.latitude, p.longitude]);

  const trajectory: [number, number][] | null =
    store && delivery ? [[store.latitude, store.longitude], [delivery.latitude, delivery.longitude]] : null;

  const center = points[0] ?? [-25.9692, 32.5732];

  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {store ? (
        <Marker position={[store.latitude, store.longitude]} icon={STORE_ICON}>
          <Popup>Loja</Popup>
        </Marker>
      ) : null}
      {delivery ? (
        <Marker position={[delivery.latitude, delivery.longitude]} icon={DELIVERY_ICON}>
          <Popup>Local de entrega</Popup>
        </Marker>
      ) : null}
      {courier ? (
        <Marker position={[courier.latitude, courier.longitude]} icon={COURIER_ICON}>
          <Popup>Estafeta</Popup>
        </Marker>
      ) : null}
      {trajectory ? <Polyline positions={trajectory} pathOptions={{ color: "#059669", dashArray: "6 6" }} /> : null}
      <FitBounds points={points} />
    </MapContainer>
  );
}
