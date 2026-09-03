"use client";

import type { PresignResponse } from "./types";

/**
 * Presigned two-step upload: ask our BFF for an S3 upload URL, PUT the file
 * bytes directly to S3 (never through our server — no Authorization header,
 * S3 doesn't want one; the signature in the URL is the auth), then tell our
 * BFF the upload finished so it can verify + return the created resource.
 */
export async function uploadAndConfirm<T>(
  file: File,
  presign: (contentType: string) => Promise<PresignResponse>,
  confirm: (key: string) => Promise<T>,
): Promise<T> {
  const { uploadUrl, key } = await presign(file.type);

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error("Não foi possível enviar a imagem. Tente novamente.");
  }

  return confirm(key);
}
