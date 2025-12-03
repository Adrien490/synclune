import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Synchronise les champs dénormalisés d'un Product depuis ses SKUs actifs.
 * - minPriceInclTax: Prix minimum des SKUs actifs
 * - maxPriceInclTax: Prix maximum des SKUs actifs
 * - totalInventory: Stock total des SKUs actifs
 *
 * À appeler après toute modification de SKU (création, update, suppression)
 */
export async function syncProductPriceAndInventory(
	productId: string,
	tx?: Prisma.TransactionClient
): Promise<void> {
	const client = tx ?? prisma;

	// Calculer les agrégats depuis les SKUs actifs
	const aggregates = await client.productSku.aggregate({
		where: {
			productId,
			isActive: true,
			deletedAt: null,
		},
		_min: { priceInclTax: true },
		_max: { priceInclTax: true },
		_sum: { inventory: true },
	});

	// Mettre à jour le Product avec les valeurs dénormalisées
	await client.product.update({
		where: { id: productId },
		data: {
			minPriceInclTax: aggregates._min.priceInclTax,
			maxPriceInclTax: aggregates._max.priceInclTax,
			totalInventory: aggregates._sum.inventory ?? 0,
		},
	});
}

/**
 * Synchronise les champs dénormalisés pour plusieurs produits.
 * Utile pour les opérations en batch.
 */
export async function syncMultipleProductsPriceAndInventory(
	productIds: string[],
	tx?: Prisma.TransactionClient
): Promise<void> {
	if (productIds.length === 0) return;

	const client = tx ?? prisma;

	// Utiliser une requête SQL brute pour l'efficacité avec plusieurs produits
	await client.$executeRaw`
		UPDATE "Product" p
		SET
			"minPriceInclTax" = subq.min_price,
			"maxPriceInclTax" = subq.max_price,
			"totalInventory" = COALESCE(subq.total_inventory, 0),
			"updatedAt" = NOW()
		FROM (
			SELECT
				"productId",
				MIN("priceInclTax") as min_price,
				MAX("priceInclTax") as max_price,
				SUM(inventory) as total_inventory
			FROM "ProductSku"
			WHERE "productId" = ANY(${productIds})
				AND "isActive" = true
				AND "deletedAt" IS NULL
			GROUP BY "productId"
		) subq
		WHERE p.id = subq."productId"
	`;

	// Mettre à null les produits sans SKU actif
	await client.$executeRaw`
		UPDATE "Product"
		SET
			"minPriceInclTax" = NULL,
			"maxPriceInclTax" = NULL,
			"totalInventory" = 0,
			"updatedAt" = NOW()
		WHERE id = ANY(${productIds})
			AND NOT EXISTS (
				SELECT 1 FROM "ProductSku"
				WHERE "ProductSku"."productId" = "Product".id
					AND "ProductSku"."isActive" = true
					AND "ProductSku"."deletedAt" IS NULL
			)
	`;
}
