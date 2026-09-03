import { NewStaffForm } from "./NewStaffForm";

export default async function NewStaffPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  return <NewStaffForm shopId={shopId} />;
}
