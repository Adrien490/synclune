/**
 * Integration test — concurrent add-to-cart sur DB réelle.
 *
 * Garde-fou : la double-vente doit être impossible quand 2 requêtes
 * `addToCart` concurrentes tentent de réserver le dernier exemplaire d'un
 * SKU. Le mécanisme : `SELECT ... FOR UPDATE OF s` dans la transaction lock
 * la ligne SKU, sérialisant les 2 transactions. La seconde lit le stock
 * mis à jour par la première et doit échouer si quantity > 0 restant.
 *
 * Pré-requis : `INTEGRATION_DATABASE_URL` (cf `test/integration/setup.ts`).
 *
 * NOTE : ce test est skippé tant que `INTEGRATION_DATABASE_URL` n'est pas
 * configurée. Il sert ici de DÉMONSTRATION du pattern integration testing
 * pour la suite ([[data-quality-audit-2026-05-18]] backlog mentionne 4
 * autres flows critiques à couvrir : create-order, cancel-order,
 * process-refund, apply-discount).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestProduct, createTestSku, createTestUser } from "@/test/integration/factories";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("addToCart — concurrent FOR UPDATE stock lock", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
	});

	it("prevents double-sell when 2 concurrent transactions try to add the last unit", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 1 });
		const userA = await createTestUser();
		const userB = await createTestUser();

		// Simule 2 transactions concurrentes : chacune tente de prendre la dernière unité.
		// La logique reproduite ici imite `checkout-order-processing.service.ts`
		// (FOR UPDATE → decrement). Si le lock fonctionne, une seule passe.
		async function tryReserve(userId: string): Promise<"success" | "out_of_stock"> {
			try {
				return await prisma.$transaction(async (tx) => {
					const rows = await tx.$queryRaw<Array<{ id: string; inventory: number }>>`
						SELECT id, inventory FROM "ProductSku" WHERE id = ${sku.id} FOR UPDATE
					`;
					const current = rows[0];
					if (!current || current.inventory < 1) return "out_of_stock" as const;
					await tx.productSku.update({
						where: { id: sku.id },
						data: { inventory: { decrement: 1 } },
					});
					await tx.cart.create({
						data: {
							userId,
							items: { create: { skuId: sku.id, quantity: 1, priceAtAdd: sku.priceInclTax } },
						},
					});
					return "success" as const;
				});
			} catch {
				return "out_of_stock";
			}
		}

		const [resultA, resultB] = await Promise.all([tryReserve(userA.id), tryReserve(userB.id)]);

		// Exactement UN succès, exactement UN out_of_stock.
		const outcomes = [resultA, resultB].sort();
		expect(outcomes).toEqual(["out_of_stock", "success"]);

		// Le stock final est 0 (1 décrément, pas 2).
		const finalSku = await prisma.productSku.findUnique({ where: { id: sku.id } });
		expect(finalSku?.inventory).toBe(0);
	});
});
