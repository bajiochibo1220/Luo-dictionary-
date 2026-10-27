import { getCurrentAccount } from "@/lib/account-data";
import { WebAccountHelp } from "@/components/shared/web-account-help";
export default async function AdminHelp(){return <WebAccountHelp account={await getCurrentAccount()}/>;}
