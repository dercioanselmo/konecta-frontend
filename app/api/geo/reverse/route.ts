import { NextResponse } from "next/server";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "KONECTA-Frontend/1.0 (contact: dev@konecta.co.mz)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "lat/lon em falta." }, { status: 400 });
  }

  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("format", "jsonv2");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { code: "UPSTREAM_ERROR", message: "Não foi possível obter o endereço." },
      { status: 502 },
    );
  }
  const result = (await res.json()) as { display_name?: string };
  return NextResponse.json({ label: result.display_name ?? null });
}
