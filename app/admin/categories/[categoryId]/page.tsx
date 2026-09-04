import { CategoryDetailView } from "./CategoryDetailView";

export default async function AdminCategoryDetailPage({ params }: PageProps<"/admin/categories/[categoryId]">) {
  const { categoryId } = await params;
  return <CategoryDetailView categoryId={categoryId} />;
}
