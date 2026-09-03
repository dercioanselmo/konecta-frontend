import Image from "next/image";
import Link from "next/link";
import type { UserProfile } from "@/lib/auth/types";

/** Avatar + name in the top-right corner, linking to /profile — every shell uses this. */
export function UserMenu({ user }: { user: UserProfile }) {
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <Link
      href="/profile"
      className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface-hover"
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-green/15 text-xs font-semibold text-brand-green">
        {user.photoUrl ? (
          <Image src={user.photoUrl} alt="" fill sizes="32px" className="object-cover" unoptimized />
        ) : (
          initials
        )}
      </span>
      <span className="hidden text-sm font-medium text-foreground sm:inline">{user.firstName}</span>
    </Link>
  );
}
