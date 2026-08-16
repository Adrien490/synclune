/**
 * Setup pour la suite integration tests.
 *
 * 1. Vérifie qu'`INTEGRATION_DATABASE_URL` est set (sinon skip la suite).
 * 2. Au boot du worker : `prisma db push --force-reset` pour avoir un schéma
 *    propre et à jour. Schéma isolé par worker via VITEST_WORKER_ID. Plus de
 *    gardes SQL bruts à rejouer : le schéma lean n'en a aucun (lot 2).
 * 3. `beforeEach` : `TRUNCATE ... CASCADE` sur toutes les tables, la liste
 *    étant dérivée de `pg_tables` (jamais codée en dur — cf. commentaire).
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
	execSync("pnpm prisma db push --force-reset", {
		env: { ...process.env, DATABASE_URL: url },
		stdio: "pipe", // mute the noisy output, surface only on error
	});
});

beforeEach(async () => {
	if (skip) return;

	const prisma = getIntegrationPrismaClient();

	// Truncate de toutes les tables entre chaque test (bien plus rapide qu'un
	// re-push), l'ordre des FK étant géré par CASCADE.
	//
	// La liste est DÉRIVÉE de la base, jamais écrite à la main. Une liste
	// codée en dur avait dérivé sans que personne ne le voie : elle citait 5
	// tables disparues (`Review`, `DiscountException`, `ProductImage`,
	// `ProductMaterial`, `ProductColor` — renommées par les migrations M2M) et
	// en oubliait 16 vivantes. Effet : `TRUNCATE` échouait en 42P01 dans ce
	// `beforeEach`, donc **toute** la suite d'intégration était rouge — les 15
	// specs qui gardent la numérotation gap-free sous concurrence, le trigger
	// cross-table et les locks FOR UPDATE ne tournaient plus. Audit schéma
	// 2026-07-26.
	//
	// `_prisma_migrations` est exclue : bookkeeping Prisma, pas de la donnée de test.
	await prisma.$executeRawUnsafe(`
		DO $$
		DECLARE tables text;
		BEGIN
			SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
			INTO tables
			FROM pg_tables
			WHERE schemaname = current_schema()
			  AND tablename <> '_prisma_migrations';

			IF tables IS NOT NULL THEN
				EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
			END IF;
		END $$;
	`);
});

afterAll(async () => {
	if (skip) return;
	await getIntegrationPrismaClient().$disconnect();
});
