import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account-data";
import { WebAccountHistory } from "@/components/shared/web-account-history";

export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  return <WebAccountHistory account={account} />;
}
