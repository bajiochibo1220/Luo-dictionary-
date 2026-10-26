import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { cacheForRender } from "@/lib/render-cache";
import { prisma } from "@/lib/db";
import { NATIVE_RETURN_COOKIE, nativeReturnFromCookie, nativeAuthHref } from "@/lib/native-auth-contract";
import { assertAccountRateLimit } from "@/lib/account-security";
import { getNativeSessionUserId } from "@/lib/native-auth";

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

export const { handlers, auth: uncachedAuth, signIn, signOut } = NextAuth({
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
  session: { strategy: "jwt", maxAge: 10 * 60 },
  jwt: { maxAge: 10 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/register/complete-google",
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
          id: profile.sub,
          name: profile.name,
          email: profile.email?.trim().toLowerCase(),
          image: profile.picture,
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
        if (typeof credentials.email !== "string" || credentials.email.length > 254 || typeof credentials.password !== "string" || credentials.password.length > 128) return null;
        await assertAccountRateLimit(credentials.email, "login", 15);

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
            role: lr.role === "cultural_expert" ? "content_editor" : lr.role,
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
            select: {
              status: true,
              sessionVersion: true,
              isSuperAdmin: true,
              isMasterSuperAdmin: true,
              languageRoles: { select: { languageId: true, role: true, language: { select: { code: true, name: true } } } },
            },
          });
          if (dbUser?.status === "active") {
            if (!user && (token.sessionVersion ?? 0) !== (dbUser.sessionVersion ?? 0)) return null;
            token.sessionVersion = dbUser.sessionVersion ?? 0;
            token.isSuperAdmin = dbUser.isSuperAdmin || dbUser.isMasterSuperAdmin;
            token.isMasterSuperAdmin = dbUser.isMasterSuperAdmin;
            token.languageRoles = dbUser.languageRoles
              .map((lr) => ({
                  languageId: lr.languageId,
                  languageCode: lr.language.code,
                  languageName: lr.language.name,
                  role: lr.role === "cultural_expert" ? "content_editor" : lr.role,
                }));
          } else {
            return null;
          }
        } catch (err) {
          console.error("[auth] could not verify account access");
          return null;
        }
      }

      return token.id ? token : null;
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
    async signIn({ user, account: providerAccount, profile }) {
      if (providerAccount?.provider === "google") {
        const cookieStore = await cookies();
        const googleIntent = cookieStore.get("google-auth-intent")?.value;
        cookieStore.delete("google-auth-intent");
        const nativeReturn = nativeReturnFromCookie(cookieStore.get(NATIVE_RETURN_COOKIE)?.value);
        const loginError = (error: string) => nativeAuthHref("login", nativeReturn, { error });
        const email = user.email?.trim();
        const googleProfile = profile as { email_verified?: boolean } | undefined;
        if (!googleProfile?.email_verified || !email) {
          return loginError("GoogleVerificationFailed");
        }

        const linkedAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: providerAccount.providerAccountId,
            },
          },
          select: { userId: true },
        });
        const accountUser = linkedAccount
          ? await prisma.user.findUnique({ where: { id: linkedAccount.userId }, select: { status: true } })
          : await prisma.user.findFirst({
              where: { email: { equals: email, mode: "insensitive" } },
              select: { status: true },
            });

        if (accountUser?.status === "suspended") return loginError("AccountSuspended");
        if (accountUser) return true;

        return googleIntent === "register"
          ? true
          : loginError("GoogleAccountNotFound");
      }

      let accountUser = user.id
        ? await prisma.user.findUnique({
            where: { id: user.id },
            select: { status: true },
          })
        : null;

      if (accountUser?.status === "suspended") return false;

      // Keep credentials and already-linked provider accounts consistent with
      // authorize(): missing and suspended local accounts cannot sign in.
      return !!accountUser && accountUser.status !== "suspended";
    },
  },
  trustHost: true,
});

// React memoizes only within one server render. Each new request still checks
// the current account and roles; no session or privileges are shared between users.
export const auth = cacheForRender(async () => {
  const authorization = (await headers()).get("Authorization");
  if (authorization === null) return uncachedAuth();
  // All existing role/consent checks now apply to native requests as well.
  // An invalid bearer must never fall back to somebody else's browser cookie.
  const id = await getNativeSessionUserId(authorization);
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, image: true, status: true, isSuperAdmin: true, isMasterSuperAdmin: true, languageRoles: { select: { languageId: true, role: true, language: { select: { code: true, name: true } } } } } });
  if (!user || user.status !== "active") return null;
  return { expires: new Date(Date.now() + 600000).toISOString(), user: { id: user.id, email: user.email, name: user.name, image: user.image, isSuperAdmin: user.isSuperAdmin || user.isMasterSuperAdmin, isMasterSuperAdmin: user.isMasterSuperAdmin, languageRoles: user.languageRoles.map(role => ({ languageId: role.languageId, role: role.role === "cultural_expert" ? "content_editor" : role.role, languageCode: role.language.code, languageName: role.language.name })) } };
});
