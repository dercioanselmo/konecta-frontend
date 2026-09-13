import Image from "next/image";

interface CourierInfoCardProps {
  courierName?: string | null;
  courierPhone?: string | null;
  courierPhotoUrl?: string | null;
}

/**
 * Shown once an order has a courier assigned — used on the customer,
 * merchant, and (in principle) courier order-detail screens alike. Renders
 * nothing until the backend actually returns a name (see the PROPOSED note
 * on `Order.courierName` in lib/checkout/types.ts) rather than showing an
 * empty/broken card.
 */
export function CourierInfoCard({ courierName, courierPhone, courierPhotoUrl }: CourierInfoCardProps) {
  if (!courierName) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-background">
        {courierPhotoUrl ? (
          <Image src={courierPhotoUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg text-muted">
            {courierName[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-muted">Entregador</p>
        <p className="text-sm font-semibold text-foreground">{courierName}</p>
        {courierPhone ? <p className="text-sm text-muted">{courierPhone}</p> : null}
      </div>
    </div>
  );
}
