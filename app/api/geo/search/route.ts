import { NextResponse } from "next/server";

// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// requires an identifying User-Agent and caps usage at ~1 req/sec — proxied
// here (rather than called directly from the browser) so we control both,
// and so no API key/quota exists on the client to begin with.
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "KONECTA-Frontend/1.0 (contact: dev@konecta.co.mz)";

// Keeps address search results within the Maputo metro area, matching the
// backend's own bounding-box sanity check on shop coordinates.
const MAPUTO_VIEWBOX = "32.3,-25.7,32.8,-26.3"; // left,top,right,bottom

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "Indique um endereço." }, { status: 400 });
  }

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "mz");
  url.searchParams.set("viewbox", MAPUTO_VIEWBOX);
  url.searchParams.set("bounded", "1");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { code: "UPSTREAM_ERROR", message: "Não foi possível pesquisar o endereço." },
      { status: 502 },
    );
  }
  const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return NextResponse.json(
    results.map((r) => ({ latitude: Number(r.lat), longitude: Number(r.lon), label: r.display_name })),
  );
}
