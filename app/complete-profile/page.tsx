import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { CompleteProfileForm } from "./CompleteProfileForm";

export default async function CompleteProfilePage({ searchParams }: PageProps<"/complete-profile">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isProfileComplete(user)) redirect(roleHomePath(user.role));

  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  return <CompleteProfileForm user={user} nextPath={nextPath} />;
}
