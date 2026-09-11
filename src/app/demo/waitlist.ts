/** Roles offered on the early-access form; validated again on the server. */
export const WAITLIST_ROLES = [
  "Teacher",
  "Administrator",
  "IT / District",
  "Other",
] as const;

export type WaitlistState = {
  status: "idle" | "success" | "error";
  message: string | null;
};
