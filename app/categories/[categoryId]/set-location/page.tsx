import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SetLocationView } from "./SetLocationView";

export default async function CategorySetLocationPage({
  params,
}: PageProps<"/categories/[categoryId]/set-location">) {
  const { categoryId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/categories/${categoryId}/access`);
  if (user.latitude != null && user.longitude != null) redirect(`/categories/${categoryId}`);

  return <SetLocationView user={user} categoryId={categoryId} />;
}
