import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { CompleteProfileForm } from "./CompleteProfileForm";

export default async function CompleteProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isProfileComplete(user)) redirect(roleHomePath(user.role));

  return <CompleteProfileForm user={user} />;
}
