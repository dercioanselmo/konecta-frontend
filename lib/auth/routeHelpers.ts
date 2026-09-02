import "server-only";
import { NextResponse } from "next/server";
import { ApiError } from "./types";

/** Converts a caught error from authApiFetch into a NextResponse, preserving status/code. */
export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { code: error.code, message: error.message, details: error.details },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { code: "UNKNOWN_ERROR", message: "Ocorreu um erro inesperado. Tente novamente." },
    { status: 502 },
  );
}
