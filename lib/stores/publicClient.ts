"use client";

interface PublicStoreStatus {
  isOpen: boolean;
  storeName: string;
  storeLogoUrl: string | null;
}

export function getPublicStoreStatus(storeId: string): Promise<PublicStoreStatus> {
  return fetch(`/api/stores/${storeId}`, { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error("Não foi possível consultar o estado da loja.");
    return (await response.json()) as PublicStoreStatus;
  });
}