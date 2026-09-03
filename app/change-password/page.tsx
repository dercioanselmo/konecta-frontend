import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { mustChangePassword } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // If they don't need to change password, send them home
  if (!mustChangePassword(user)) redirect(roleHomePath(user.role));

  return <ChangePasswordForm user={user} />;
}
