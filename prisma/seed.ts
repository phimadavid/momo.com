/**
 * CLI entry for the demo seed: `npm run db:seed`.
 *
 * The seed itself lives in `src/server/demo/seed.ts` so the app's scheduled
 * demo reset (`/api/demo/reset`) can run exactly the same build. It is
 * idempotent — re-running resets the seeded rows rather than duplicating them.
 */
import { PrismaClient } from "../generated/prisma";
import { DEMO_PASSWORD } from "../src/server/demo/accounts";
import { seedDemoSchool } from "../src/server/demo/seed";

const db = new PrismaClient();

async function main() {
  console.log("Resetting seeded data…");
  const summary = await seedDemoSchool(db);

  console.log("Seed complete:");
  console.log(`  term       ${summary.term}`);
  console.log(`  sections   ${summary.sections} for Dr. Chen`);
  console.log(`\n  Sign in with password "${DEMO_PASSWORD}":`);
  console.log(`    teacher  aris.chen@momosmart.edu`);
  console.log(`    student  ohs-28491@student.momosmart.edu   (Alex Rivera)`);
  console.log(`    student  ohs-2026-88@student.momosmart.edu (Marcus Rivera)`);
  console.log(`    admin    registrar@momosmart.edu`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
