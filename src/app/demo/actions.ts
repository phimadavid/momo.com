"use server";

import { AuthError } from "next-auth";
import { notFound } from "next/navigation";
import { z } from "zod";

import { env } from "~/env";
import { signIn, signOut } from "~/server/auth";
import { homeForRole } from "~/server/auth/home";
import { db } from "~/server/db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "~/server/demo/accounts";
import { WAITLIST_ROLES, type WaitlistState } from "./waitlist";

export type DemoState = { error: string | null };

/** Only these two personas are offered publicly; the admin stays login-only. */
const demoRoleSchema = z.enum(["teacher", "student"]);

const DEMO_HOME = {
  teacher: homeForRole("TEACHER"),
  student: homeForRole("STUDENT"),
} as const;

/**
 * Signs the visitor into a shared demo account. A successful sign-in redirects
 * and never returns.
 */
export async function startDemo(
  _previous: DemoState,
  formData: FormData,
): Promise<DemoState> {
  if (!env.DEMO_MODE) notFound();

  const role = demoRoleSchema.safeParse(formData.get("role"));
  if (!role.success) return { error: "Choose a demo role." };

  const account = DEMO_ACCOUNTS.find((entry) => entry.key === role.data);
  if (!account) return { error: "Choose a demo role." };

  try {
    await signIn("credentials", {
      email: account.email,
      password: DEMO_PASSWORD,
      redirectTo: DEMO_HOME[role.data],
    });
  } catch (error) {
    // A successful sign-in throws NEXT_REDIRECT, which must bubble up. A failed
    // one almost always means the scheduled reset is rebuilding the accounts.
    if (error instanceof AuthError) {
      return {
        error: "The demo school is being refreshed. Try again in a minute.",
      };
    }
    throw error;
  }

  return { error: null };
}

/** Leaves the demo and returns to the role picker. */
export async function leaveDemo() {
  await signOut({ redirectTo: "/demo" });
}

/** FormData gives `null` for absent fields; zod's `optional` wants `undefined`. */
const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
};

/** An optional free-text field; blank input is stored as `null`. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value));

const waitlistSchema = z.object({
  email: z
    .string({ required_error: "Enter your work email address." })
    .trim()
    .toLowerCase()
    .email("Enter a valid work email address."),
  name: optionalText(120, "Keep your name under 120 characters."),
  school: z
    .string({ required_error: "Tell us which school or district you're with." })
    .trim()
    .min(2, "Tell us which school or district you're with.")
    .max(160, "Keep the school name under 160 characters."),
  role: z.enum(WAITLIST_ROLES, {
    errorMap: () => ({ message: "Choose the role that fits you best." }),
  }),
  message: optionalText(1000, "Keep the note under 1,000 characters."),
  // Missing or malformed attribution falls back rather than rejecting a lead.
  source: z.string().trim().min(1).max(40).catch("demo"),
});

/**
 * Records an early-access request. A repeat signup from the same email updates
 * the existing entry instead of failing.
 */
export async function joinWaitlist(
  _previous: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  // Honeypot: real visitors never see this field, so anything in it is a bot.
  // Report success so the bot has nothing to retry against.
  if (field(formData, "website")) {
    return { status: "success", message: "You're on the list." };
  }

  const parsed = waitlistSchema.safeParse({
    email: field(formData, "email"),
    name: field(formData, "name"),
    school: field(formData, "school"),
    role: field(formData, "role"),
    message: field(formData, "message"),
    source: field(formData, "source"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your details.",
    };
  }

  const { email, ...details } = parsed.data;

  try {
    await db.waitlistEntry.upsert({
      where: { email },
      create: { email, ...details },
      update: details,
    });
  } catch (error) {
    console.error("waitlist signup failed", error);
    return {
      status: "error",
      message: "We couldn't save your request. Please try again.",
    };
  }

  return {
    status: "success",
    message: `You're on the list. We'll be in touch at ${email}.`,
  };
}
