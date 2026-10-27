"use client";
import { NavigationLink } from "@/components/layout/navigation-link";
import type { HelpAccount } from "@/lib/account-help";
import { AccountHelp } from "./account-help";
export function WebAccountHelp({account}:{account:HelpAccount}){return <AccountHelp account={account} Link={NavigationLink}/>;}
