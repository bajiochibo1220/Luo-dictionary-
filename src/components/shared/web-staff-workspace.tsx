"use client";
import { ManagementWorkspace } from "./management-workspace";
import type { AppAccount } from "@/lib/account-contract";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebStaffWorkspace(props: { account: AppAccount; languageId: number; englishLanguageId?: number; languages?: { id: number; code: string; nativeName: string; name?: string }[] }) { return <ManagementWorkspace {...props} request={webFeatureRequest} transport={fetch} />; }
