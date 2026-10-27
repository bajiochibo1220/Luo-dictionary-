import { getCurrentAccount } from "@/lib/account-data";
import { WebAccountHelp } from "@/components/shared/web-account-help";
import { PartnerBranding } from "@/components/shared/partner-branding";
import { InterfaceLanguageSelector } from "@/components/shared/interface-language";
import { APP_NAME } from "@/lib/brand";
export const dynamic="force-dynamic";
export default async function HelpPage(){
  const account=await getCurrentAccount();
  return <main className="relative isolate min-h-dvh bg-[#eee5d5]"><PartnerBranding/><div className="relative z-10"><header className="flex items-center justify-between gap-3 border-b border-stone-300 px-4 py-3"><span className="truncate font-serif text-xl">{APP_NAME}</span><InterfaceLanguageSelector/></header><WebAccountHelp account={account}/></div></main>;
}
