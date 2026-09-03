"use client";

import Link from "next/link";

interface ShopNavProps {
  shopId: string;
  shopName: string;
  hideStaff?: boolean;
  /** Prefix before `/${shopId}/...` for every shop-scoped link. */
  basePath?: string;
  /** Where "← back" goes — the shop list this shop was opened from. */
  listHref?: string;
  listLabel?: string;
}

export function ShopNav({
  shopId,
  shopName,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: ShopNavProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Link href={listHref} className="text-sm text-muted hover:underline">
          ← {listLabel}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{shopName}</h1>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
        <Link
          href={`${basePath}/${shopId}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Painel
        </Link>
        <Link
          href={`${basePath}/${shopId}/products`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Produtos
        </Link>
        <Link
          href={`${basePath}/${shopId}/hours`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Horário
        </Link>
        {!hideStaff ? (
          <Link
            href={`${basePath}/${shopId}/staff`}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
          >
            Funcionários
          </Link>
        ) : null}
        <Link
          href={`${basePath}/${shopId}/settings`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Definições
        </Link>
      </nav>
    </div>
  );
}
