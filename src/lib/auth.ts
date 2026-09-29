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
      isMasterSuperAdmin: boolean;
      languageRoles: LanguageRole[];
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    isSuperAdmin?: boolean;
    isMasterSuperAdmin?: boolean;
    languageRoles?: LanguageRole[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...PrismaAdapter(prisma),
    // Prisma's default adapter uses an exact email match. Normalize Google
    // addresses here so an existing password account can be linked even when
    // its stored email casing differs from Google's verified address.
    async getUserByEmail(email) {
      return prisma.user.findFirst({
        where: { email: { equals: email.trim(), mode: "insensitive" } },
      });
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google verifies the email address, so allow its account to attach to
      // an existing password account with the same normalized email.
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          ...profile,
          email: profile.email?.trim().toLowerCase(),
        };
      },
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

        const user = await prisma.user.findFirst({
          where: { email: { equals: (credentials.email as string).trim(), mode: "insensitive" } },
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
          isMasterSuperAdmin: user.isMasterSuperAdmin,
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
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { languageRoles: { include: { language: true } } },
          });
          if (dbUser) {
            const accountActive = dbUser.status === "active";
            const nonPrivilegedRoles = [
              "registered",
              "student",
              "teacher",
              "researcher",
              "contributor",
              "elder",
            ];
            token.isSuperAdmin = dbUser.isSuperAdmin && accountActive;
            token.isMasterSuperAdmin = dbUser.isMasterSuperAdmin && accountActive;
            token.languageRoles = dbUser.languageRoles
              .filter((lr) => accountActive || nonPrivilegedRoles.includes(lr.role))
              .map((lr) => ({
                  languageId: lr.languageId,
                  languageCode: lr.language.code,
                  languageName: lr.language.name,
                  role: lr.role,
                }));
          } else {
            token.id = undefined;
            token.isSuperAdmin = false;
            token.isMasterSuperAdmin = false;
            token.languageRoles = [];
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
        (session.user as any).isMasterSuperAdmin =
          (token.isMasterSuperAdmin as boolean) ?? false;
        (session.user as any).languageRoles =
          (token.languageRoles as LanguageRole[]) ?? [];
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.id) return false;
      const account = await prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      // Match credentials authorization: pending accounts may authenticate,
      // but suspended or missing accounts may not. Pending users are kept out
      // of privileged routes because JWT role claims are only loaded as active.
      return !!account && account.status !== "suspended";
    },
  },
  trustHost: true,
});
