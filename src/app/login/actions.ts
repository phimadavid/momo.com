"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "~/server/auth";

export type LoginState = { error: string | null };

const loginSchema = z.object({
  email: z.string().email("Enter a valid school email address."),
  password: z.string().min(1, "Enter your password."),
});

/**
 * Signs the user in with email + password. Returns a message for the form to
 * render; a successful sign-in redirects and never returns.
 */
export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    // A successful sign-in throws NEXT_REDIRECT, which must bubble up.
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Incorrect email or password."
            : "We could not sign you in. Please try again.",
      };
    }
    throw error;
  }

  return { error: null };
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
