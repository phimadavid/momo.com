/**
 * Accounts created by the demo seed (`seedDemoSchool`). Every demo account
 * shares one password. Development / demo data only — real accounts are created
 * through the school's own provisioning flow.
 */
export const DEMO_PASSWORD = "momo1234";

export const DEMO_ACCOUNTS = [
  {
    key: "teacher",
    role: "Teacher",
    name: "Dr. Aris Chen",
    email: "aris.chen@momosmart.edu",
  },
  {
    key: "student",
    role: "Student",
    name: "Alex Rivera",
    email: "ohs-28491@student.momosmart.edu",
  },
  {
    key: "admin",
    role: "Admin",
    name: "Registrar",
    email: "registrar@momosmart.edu",
  },
] as const;

export type DemoAccountKey = (typeof DEMO_ACCOUNTS)[number]["key"];

/** How often the scheduled reset rebuilds the demo school, for display. */
export const DEMO_RESET_HOURS = 6;

/** True for the shared accounts a public visitor can sign into from `/demo`. */
export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalised = email.toLowerCase();
  return DEMO_ACCOUNTS.some((account) => account.email === normalised);
}
