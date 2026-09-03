import Link from "next/link";

export function ShopNav({ shopId, shopName }: { shopId: string; shopName: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Link href="/merchant" className="text-sm text-muted hover:underline">
          ← As suas lojas
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{shopName}</h1>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
        <Link
          href={`/merchant/shops/${shopId}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Painel
        </Link>
        <Link
          href={`/merchant/shops/${shopId}/products`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Produtos
        </Link>
        <Link
          href={`/merchant/shops/${shopId}/hours`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Horário
        </Link>
        <Link
          href={`/merchant/shops/${shopId}/staff`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Funcionários
        </Link>
        <Link
          href={`/merchant/shops/${shopId}/settings`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Definições
        </Link>
      </nav>
    </div>
  );
}
