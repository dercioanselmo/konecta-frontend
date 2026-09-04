import { redirect } from "next/navigation";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { getCurrentUser } from "@/lib/auth/session";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <CustomerHeader user={user} backHref="/cart" backLabel="← Carrinho" />

      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-xl font-bold text-foreground">Finalização de compra</h1>
        <p className="max-w-xs text-sm text-muted">
          O checkout (endereço, entrega e pagamento) chega numa próxima fase. O seu carrinho está guardado.
        </p>
      </main>
    </div>
  );
}
