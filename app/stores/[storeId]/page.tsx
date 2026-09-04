import Link from "next/link";

export default async function StorePage({ params }: PageProps<"/stores/[storeId]">) {
  await params;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <Link href="/home" className="text-sm text-muted hover:underline">
        ← Categorias
      </Link>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-xl font-bold text-foreground">Página da loja</h1>
        <p className="max-w-xs text-sm text-muted">
          O catálogo e a página da loja chegam numa próxima fase. Volte em breve.
        </p>
      </main>
    </div>
  );
}
