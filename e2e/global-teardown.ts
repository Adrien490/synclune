import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Global teardown: clean up test-created data after the entire E2E run.
 *
 * Deletes records matching the test email pattern `e2e-%@synclune-test.com`.
 * This ensures no test data accumulates across runs.
 *
 * Runs after all tests complete (success or failure).
 */
async function globalTeardown() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.warn("[teardown] DATABASE_URL not set — skipping cleanup");
		return;
	}

	const adapter = new PrismaNeon({ connectionString: databaseUrl });
	const prisma = new PrismaClient({ adapter });

	try {
		console.log("[teardown] Cleaning up test data...");

		// 1. Delete test user accounts (created by signup-flow.spec.ts)
		const deletedUsers = await prisma.user.deleteMany({
			where: {
				AND: [{ email: { startsWith: "e2e-" } }, { email: { endsWith: "@synclune-test.com" } }],
			},
		});
		if (deletedUsers.count > 0) {
			console.log(`[teardown] Deleted ${deletedUsers.count} test user(s)`);
		}

		console.log("[teardown] Cleanup complete");
	} catch (error) {
		console.error("[teardown] Cleanup failed:", error);
	} finally {
		await prisma.$disconnect();
	}
}

export default globalTeardown;
