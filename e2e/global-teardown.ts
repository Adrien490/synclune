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

		// Schéma lean : plus de table User — on nettoie les commandes de test.
		const deletedOrders = await prisma.order.deleteMany({
			where: {
				AND: [{ email: { startsWith: "e2e-" } }, { email: { endsWith: "@synclune-test.com" } }],
			},
		});
		if (deletedOrders.count > 0) {
			console.log(`[teardown] Deleted ${deletedOrders.count} test order(s)`);
		}

		console.log("[teardown] Cleanup complete");
	} catch (error) {
		console.error("[teardown] Cleanup failed:", error);
	} finally {
		await prisma.$disconnect();
	}
}

export default globalTeardown;
