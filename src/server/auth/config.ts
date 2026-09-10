import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { db } from "~/server/db";
import type { UserRole } from "../../../generated/prisma";

/**
 * Module augmentation for `next-auth`. The session carries the caller's role
 * plus the ids of their academic profiles so that authorisation checks in the
 * tRPC layer never have to re-resolve them.
 *
 * @see https://authjs.dev/getting-started/typescript
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      /** Set when the user is a student. */
      studentId: string | null;
      /** Set when the user is a teacher. */
      teacherId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    studentId?: string | null;
    teacherId?: string | null;
  }
}

/**
 * What we carry on the session token beyond the NextAuth defaults.
 *
 * The `JWT` interface is not augmented here: next-auth and @auth/prisma-adapter
 * resolve to different copies of `@auth/core`, so an augmentation would attach
 * to the wrong one. The token is a `Record<string, unknown>`, so the claims are
 * written as plain fields and read back through `readClaims`.
 */
type SessionClaims = {
  id: string;
  role: UserRole;
  studentId: string | null;
  teacherId: string | null;
};

const ROLES: UserRole[] = ["STUDENT", "TEACHER", "ADMIN"];

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

function readClaims(token: Record<string, unknown>): SessionClaims {
  const role = token.role;
  return {
    id: asString(token.id) ?? "",
    role: ROLES.includes(role as UserRole) ? (role as UserRole) : "STUDENT",
    studentId: asString(token.studentId),
    teacherId: asString(token.teacherId),
  };
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * Sign-in is email + password against the `User.passwordHash` column. Credential
 * sign-in cannot use database sessions, so the session is a JWT and the role /
 * profile ids are carried on the token.
 *
 * @see https://authjs.dev/getting-started/authentication/credentials
 */
export const authConfig = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    // A school day plus a margin; re-authentication is cheap.
    maxAge: 12 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            isActive: true,
            passwordHash: true,
            studentProfile: { select: { id: true } },
            teacherProfile: { select: { id: true } },
          },
        });

        // Same failure for unknown accounts and bad passwords, so the form
        // cannot be used to enumerate who has an account.
        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          studentId: user.studentProfile?.id ?? null,
          teacherId: user.teacherProfile?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      // On sign-in the authorize() result is available and already authoritative.
      if (user) {
        const claims: SessionClaims = {
          id: asString(user.id) ?? "",
          role: user.role ?? "STUDENT",
          studentId: user.studentId ?? null,
          teacherId: user.teacherId ?? null,
        };
        return { ...token, ...claims };
      }

      const current = readClaims(token);
      if (!current.id) return null;

      // A JWT outlives the row it describes, so re-read the account on each
      // request: deleted or deactivated users lose access immediately instead
      // of staying signed in until the token expires, and role or profile
      // changes apply without a fresh sign-in. `auth()` is cached per request,
      // so this costs one indexed lookup per request.
      const account = await db.user.findUnique({
        where: { id: current.id },
        select: {
          isActive: true,
          role: true,
          studentProfile: { select: { id: true } },
          teacherProfile: { select: { id: true } },
        },
      });

      // Returning null invalidates the session; the caller sees a signed-out
      // visitor rather than a 500 from a dangling user id.
      if (!account?.isActive) return null;

      return {
        ...token,
        role: account.role,
        studentId: account.studentProfile?.id ?? null,
        teacherId: account.teacherProfile?.id ?? null,
      };
    },
    session: ({ session, token }) => {
      const claims = readClaims(token);
      return {
        ...session,
        user: { ...session.user, ...claims },
      };
    },
  },
} satisfies NextAuthConfig;
