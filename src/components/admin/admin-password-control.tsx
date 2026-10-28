"use client";
import { signOut } from "next-auth/react";
import { SharedAdminPasswordControl } from "@/components/shared/admin-password-control";

export function AdminPasswordControl(props: { userId: string; email: string; own?: boolean }) {
  return <SharedAdminPasswordControl {...props} onSignInAgain={async () => { await signOut({ redirectTo: "/admin-login" }); }} />;
}
