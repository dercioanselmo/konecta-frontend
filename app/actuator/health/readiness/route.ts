import { NextResponse } from "next/server";

/**
 * Matches the K8s deployment's readinessProbe path. Deliberately doesn't
 * check downstream microservices (Auth, Stores, Cart, ...) — this is a
 * stateless BFF; a single backend hiccup shouldn't flip the frontend pod
 * to NotReady and pull it out of the Service.
 */
export async function GET() {
  return NextResponse.json({ status: "UP" });
}
