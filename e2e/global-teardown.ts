import { PrismaClient } from "../app/generated/prisma/client";
import { createPrismaAdapter } from "./helpers/prisma-adapter";
import { TEST_EMAIL_DOMAIN } from "./helpers/test-run";

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

	const adapter = createPrismaAdapter(databaseUrl);
	const prisma = new PrismaClient({ adapter });

	try {
		console.log("[teardown] Cleaning up test data...");

		// Les emails de test suivent la SSOT `helpers/test-run.ts`
		// (`e2e-…@synclune-test.com`) ; les ENTITÉS de test (produits, couleurs,
		// matériaux, collections, types) portent toutes TEST_RUN_ID (`e2e-<ts>`)
		// dans leur nom/label — y compris les copies « (copie) » des tests de
		// duplication. Le motif « e2e- » est donc le filet commun.
		// Pas de `as const` : Prisma attend un `OrderWhereInput` MUTABLE (son `AND`
		// est un tableau modifiable), un tuple readonly ne s'y assigne pas.
		const testEmailWhere = {
			AND: [{ email: { startsWith: "e2e-" } }, { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } }],
		};
		const RUN_MARKER = "e2e-";

		// 1. Rétractations d'abord : la FK RetractationRequest.orderId est
		// RESTRICT (pas de cascade) — sans cette passe, le deleteMany des
		// commandes échoue dès qu'un spec rétractation a crashé avant son cleanup.
		const deletedRetractations = await prisma.retractationRequest.deleteMany({
			where: { order: testEmailWhere },
		});
		if (deletedRetractations.count > 0) {
			console.log(`[teardown] Deleted ${deletedRetractations.count} test retractation(s)`);
		}

		// 2. Commandes de test (les OrderItem partent en cascade).
		const deletedOrders = await prisma.order.deleteMany({ where: testEmailWhere });
		if (deletedOrders.count > 0) {
			console.log(`[teardown] Deleted ${deletedOrders.count} test order(s)`);
		}

		// 3. Produits de test AVANT les référentiels : les FK ProductVariant →
		// Color/Material et Product → ProductType sont RESTRICT — un produit de
		// test orphelin bloquerait leur suppression. Variantes et médias partent
		// en cascade ; les OrderItem éventuels passent en SetNull (snapshots
		// préservés). Motif : nom OU slug (les specs slugifient TEST_RUN_ID).
		const deletedProducts = await prisma.product.deleteMany({
			where: {
				OR: [{ name: { contains: RUN_MARKER } }, { slug: { contains: RUN_MARKER } }],
			},
		});
		if (deletedProducts.count > 0) {
			console.log(`[teardown] Deleted ${deletedProducts.count} test product(s)`);
		}

		// 4. Référentiels de test orphelins (specs interrompus avant leur finally).
		const [collections, colors, materials, productTypes] = await Promise.all([
			prisma.collection.deleteMany({
				where: { OR: [{ name: { contains: RUN_MARKER } }, { slug: { contains: RUN_MARKER } }] },
			}),
			prisma.color.deleteMany({ where: { name: { contains: RUN_MARKER } } }),
			prisma.material.deleteMany({ where: { name: { contains: RUN_MARKER } } }),
			prisma.productType.deleteMany({
				where: { OR: [{ label: { contains: RUN_MARKER } }, { slug: { contains: RUN_MARKER } }] },
			}),
		]);
		const refCount = collections.count + colors.count + materials.count + productTypes.count;
		if (refCount > 0) {
			console.log(
				`[teardown] Deleted ${refCount} orphan test taxonomy record(s) ` +
					`(${collections.count} collection(s), ${colors.count} color(s), ` +
					`${materials.count} material(s), ${productTypes.count} product type(s))`,
			);
		}

		console.log("[teardown] Cleanup complete");
	} catch (error) {
		console.error("[teardown] Cleanup failed:", error);
	} finally {
		await prisma.$disconnect();
	}
}

export default globalTeardown;
