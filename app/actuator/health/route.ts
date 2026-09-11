import { NextResponse } from "next/server";

/**
 * Not Spring Boot Actuator — this app is Next.js. The path only matches
 * Actuator's convention because the K8s deployment manifest (copied from a
 * Java service template) probes /actuator/health/readiness verbatim; this
 * route exists so that probe works without touching the manifest.
 */
export async function GET() {
  return NextResponse.json({ status: "UP" });
}
