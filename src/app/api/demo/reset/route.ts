import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "~/env";
import { seedDemoSchool } from "~/server/demo/seed";
import { PrismaClient } from "../../../../../generated/prisma";

// The seed issues a few hundred sequential writes.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Rebuilds the demo school, wiping whatever visitors changed. Called on a
 * schedule (see `vercel.json`) with `Authorization: Bearer $CRON_SECRET`.
 *
 * Only live when DEMO_MODE is on: the reset deletes every user, so it must
 * never be reachable on a database that holds real schools.
 */
export async function GET(request: Request) {
  if (!env.DEMO_MODE) return new NextResponse(null, { status: 404 });

  if (
    !env.CRON_SECRET ||
    !matches(request.headers.get("authorization"), `Bearer ${env.CRON_SECRET}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A dedicated client keeps the seed's query volume out of the app's
  // development query log and is released as soon as the reset finishes.
  const client = new PrismaClient();
  const started = Date.now();
  try {
    const summary = await seedDemoSchool(client);
    return NextResponse.json({
      ok: true,
      ...summary,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    console.error("demo reset failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  } finally {
    await client.$disconnect();
  }
}

/** Constant-time comparison so the secret cannot be guessed byte by byte. */
function matches(given: string | null, expected: string): boolean {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
