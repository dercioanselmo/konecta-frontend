"use client";

import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { PickupQrScanner } from "@/components/merchant/PickupQrScanner";

interface ScanOrderViewProps {
  shopId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
  expectedOrderId?: string;
}

export function ScanOrderView({
  shopId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
  expectedOrderId,
}: ScanOrderViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <div>
        <Link
          href={expectedOrderId ? `${basePath}/${shopId}/orders/${expectedOrderId}` : `${basePath}/${shopId}/orders`}
          className="text-sm text-muted hover:underline"
        >
          ← {expectedOrderId ? "Encomenda" : "Encomendas"}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-foreground">Ler código QR</h1>
        <p className="mt-1 text-sm text-muted">
          Aponte a câmara ao código mostrado pelo cliente para avançar a encomenda. A confirmação final do
          levantamento/entrega é feita na página da encomenda, depois de verificar os produtos.
        </p>
      </div>

      <PickupQrScanner shopId={shopId} basePath={basePath} expectedOrderId={expectedOrderId} />
    </div>
  );
}
