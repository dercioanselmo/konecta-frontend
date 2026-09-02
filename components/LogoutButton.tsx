"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { logout } from "@/lib/auth/client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button variant="secondary" loading={loading} onClick={handleLogout} className="w-auto px-6">
      Terminar sessão
    </Button>
  );
}
