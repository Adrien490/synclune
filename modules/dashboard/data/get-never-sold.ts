import { ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardNeverSold } from "../constants/cache";
import type { GetNeverSoldProductsReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Recupere les produits publics qui n'ont jamais ete vendus
 *
 * @param skip - Nombre de produits a ignorer (pagination)
 * @param take - Nombre de produits a retourner (pagination)
 */
export async function fetchNeverSoldProducts(
	skip: number = 0,
	take: number = 20
): Promise<GetNeverSoldProductsReturn> {
	"use cache: remote";

	cacheDashboardNeverSold();

	// Compter le total
	const totalCount = await prisma.product.count({
		where: {
			status: ProductStatus.PUBLIC,
			orderItems: { none: {} },
		},
	});

	// Recuperer les produits avec leurs SKUs
	const products = await prisma.product.findMany({
		where: {
			status: ProductStatus.PUBLIC,
			orderItems: { none: {} },
		},
		select: {
			id: true,
			title: true,
			slug: true,
			createdAt: true,
			skus: {
				where: { isActive: true },
				select: {
					inventory: true,
					priceInclTax: true,
				},
			},
		},
		orderBy: { createdAt: "asc" }, // Plus vieux en premier
		skip,
		take,
	});

	// Transformer les donnees
	const result = products.map((product) => {
		let totalInventory = 0;
		let totalValue = 0;

		for (const sku of product.skus) {
			totalInventory += sku.inventory;
			totalValue += sku.inventory * sku.priceInclTax;
		}

		return {
			productId: product.id,
			title: product.title,
			slug: product.slug,
			createdAt: product.createdAt,
			skuCount: product.skus.length,
			totalInventory,
			totalValue,
		};
	});

	return {
		products: result,
		totalCount,
	};
}
