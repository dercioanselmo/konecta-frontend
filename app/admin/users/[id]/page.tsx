import { UserDetailView } from "./UserDetailView";

export default async function AdminUserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  return <UserDetailView id={id} />;
}
