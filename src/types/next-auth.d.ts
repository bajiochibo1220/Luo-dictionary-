import type { LanguageRole } from "@/lib/auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isSuperAdmin: boolean;
      isMasterSuperAdmin: boolean;
      languageRoles: LanguageRole[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isSuperAdmin?: boolean;
    isMasterSuperAdmin?: boolean;
    languageRoles?: LanguageRole[];
  }
}
