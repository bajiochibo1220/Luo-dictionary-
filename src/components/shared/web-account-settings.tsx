"use client";
import { signOut } from "next-auth/react";
import { AccountSettings } from "./account-settings";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebAccountSettings() { return <AccountSettings request={webFeatureRequest} recoveryHref="/account-recovery" onSignedOut={() => { void signOut({ redirectTo: "/login" }); }} />; }
