import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export type LanguageRole = {
  languageId: number;
  languageCode: string;
  languageName: string;
  role: string;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isSuperAdmin: boolean;
      languageRoles: LanguageRole[];
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    isSuperAdmin?: boolean;
    languageRoles?: LanguageRole[];
  }
}

async function loadUserRoles(userId: string): Promise<LanguageRole[]> {
  const rows = await prisma.userLanguageRole.findMany({
    where: { userId },
    include: { language: true },
  });
  return rows.map((lr) => ({
    languageId: lr.languageId,
    languageCode: lr.language.code,
    languageName: lr.language.name,
    role: lr.role,
  }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            languageRoles: {
              include: { language: true },
            },
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        if (user.status === "suspended") {
          throw new Error("Account suspended");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
          languageRoles: user.languageRoles.map((lr) => ({
            languageId: lr.languageId,
            languageCode: lr.language.code,
            languageName: lr.language.name,
            role: lr.role,
          })),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false;
        token.languageRoles = (user as any).languageRoles ?? [];
      }

      if (
        (!token.languageRoles || (token.languageRoles as any[]).length === 0) &&
        token.id
      ) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
          });
          if (dbUser) {
            token.isSuperAdmin = dbUser.isSuperAdmin;
            token.languageRoles = await loadUserRoles(dbUser.id);
          }
        } catch (err) {
          console.error("[auth] failed to reload roles:", err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).isSuperAdmin =
          (token.isSuperAdmin as boolean) ?? false;
        (session.user as any).languageRoles =
          (token.languageRoles as LanguageRole[]) ?? [];
      }
      return session;
    },
  },
  trustHost: true,
});