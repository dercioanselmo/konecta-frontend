import { MerchantShell } from "@/components/merchant/MerchantShell";

export default function MerchantLayout({ children }: LayoutProps<"/merchant">) {
  return <MerchantShell>{children}</MerchantShell>;
}
