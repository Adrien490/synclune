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

// Stub minimal pour les modules qui instancient Stripe au load (cf
// `shared/lib/stripe.ts:13` — throw sans STRIPE_SECRET_KEY). Les services
// invoicing importent `getVendorLegalInfo` depuis ce module au chargement.
// Aucun appel Stripe réel n'est effectué en intégration (les hooks paiement
// restent mocks au niveau fonction).
process.env.STRIPE_SECRET_KEY ??= "sk_test_integration_stub";

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

	// `db push` ne rejoue PAS les migrations raw-SQL (triggers, CHECK non
	// exprimables dans schema.prisma). On applique ici les gardes DB dont les
	// suites d'intégration ont besoin — chaque fichier doit être idempotent
	// (CREATE OR REPLACE / DROP IF EXISTS). SSOT = le fichier de migration.
	const RAW_SQL_GUARD_MIGRATIONS = [
		// Unicité cross-table Order/Refund des numéros d'avoir (EINV-PRISMA-001).
		"prisma/migrations/20260709120000_add_credit_note_cross_table_unique_guard/migration.sql",
		// Borne basse Discount.usageCount (DISC-USAGE-002) — `db push` ne rejoue pas
		// les CHECK en SQL brut, il faut les appliquer explicitement.
		"prisma/migrations/20260726120000_add_discount_usage_count_non_negative/migration.sql",
	];
	for (const file of RAW_SQL_GUARD_MIGRATIONS) {
		// Prisma 7 : `db execute` lit l'URL via prisma.config.ts → env DATABASE_URL
		// (pas de flag --url). Même mécanisme que le `db push` ci-dessus.
		execSync(`pnpm prisma db execute --file ${file}`, {
			env: { ...process.env, DATABASE_URL: url },
			stdio: "pipe",
		});
	}
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
			"EReportingTransaction", "EReportingBatch", "EReportingPeriod",
			"Account", "Session", "User"
		RESTART IDENTITY CASCADE
	`);
});

afterAll(async () => {
	if (skip) return;
	await getIntegrationPrismaClient().$disconnect();
});
