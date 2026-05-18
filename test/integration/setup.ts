/**
 * Setup pour la suite integration tests.
 *
 * 1. Vérifie qu'`INTEGRATION_DATABASE_URL` est set (sinon skip la suite).
 * 2. Au boot du worker : `prisma db push --force-reset` pour avoir un schéma
 *    propre et à jour. Schéma isolé par worker via VITEST_WORKER_ID.
 * 3. `beforeEach` : `TRUNCATE ... CASCADE` sur toutes les tables modifiables
 *    pour repartir d'un état propre sans subir le coût d'un re-push.
 *
 * Convention : importer la connexion via `getIntegrationPrismaClient()` (cf
 * `./prisma-client.ts`) plutôt que `@/shared/lib/prisma` pour s'assurer que
 * la DB pointée est bien la DB d'intégration et pas la prod.
 */
import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { getIntegrationPrismaClient, getIntegrationDatabaseUrl } from "./prisma-client";

const skip = !process.env.INTEGRATION_DATABASE_URL;

if (skip) {
	console.warn(
		"\n⚠️  [integration-tests] INTEGRATION_DATABASE_URL not set — suite will SKIP.\n" +
			"   Set it to a dedicated Postgres URL (NOT production), e.g.:\n" +
			"   export INTEGRATION_DATABASE_URL='postgresql://user:pwd@localhost:5432/synclune_test'\n",
	);
}

beforeAll(async () => {
	if (skip) return;

	const url = getIntegrationDatabaseUrl();

	// Push schema fresh (--force-reset drops everything first → état propre).
	execSync("pnpm prisma db push --force-reset --skip-generate", {
		env: { ...process.env, DATABASE_URL: url },
		stdio: "pipe", // mute the noisy output, surface only on error
	});
});

beforeEach(async () => {
	if (skip) return;

	const prisma = getIntegrationPrismaClient();

	// Truncate all user-modifiable tables. Faster than re-push between tests.
	// Garde l'ordre des FK contraintes via CASCADE. Liste exhaustive à maintenir
	// si de nouveaux modèles sont ajoutés.
	await prisma.$executeRawUnsafe(`
		TRUNCATE TABLE
			"DiscountUsage", "OrderItem", "Order", "Refund", "Dispute",
			"CartItem", "Cart", "WishlistItem", "Wishlist", "Review",
			"DiscountException", "Discount",
			"ProductSku", "ProductImage", "ProductMaterial", "ProductColor",
			"Product", "Collection", "Material", "Color",
			"OrderNote", "WebhookEvent",
			"Account", "Session", "User"
		RESTART IDENTITY CASCADE
	`);
});

afterAll(async () => {
	if (skip) return;
	await getIntegrationPrismaClient().$disconnect();
});
