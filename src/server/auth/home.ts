import type { UserRole } from "../../../generated/prisma";

/**
 * Where a signed-in user belongs. Teachers and administrators land on the
 * command center; students stay on the landing page until their own dashboard
 * route exists.
 */
export function homeForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case "TEACHER":
    case "ADMIN":
      return "/teacher";
    default:
      return "/";
  }
}
