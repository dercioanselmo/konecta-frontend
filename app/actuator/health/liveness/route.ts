import { NextResponse } from "next/server";

/** Not currently probed by the deployment manifest, added alongside readiness for parity. */
export async function GET() {
  return NextResponse.json({ status: "UP" });
}
