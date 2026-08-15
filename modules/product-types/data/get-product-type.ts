import * as Sentry from "@sentry/nextjs";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma } from "@/shared/lib/prisma";

import { cacheProductTypeCounts, cacheProductTypeDetail } from "../constants/cache";

import { GET_PRODUCT_TYPE_SELECT } from "../constants/product-type.constants";
import { getProductTypeSchema } from "../schemas/product-type.schemas";
import type { GetProductTypeParams, GetProductTypeReturn } from "../types/product-type.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un type de produit par son slug — schéma lean : plus de statut
 * actif/inactif sur ProductType.
 */
export async function getProductTypeBySlug(
	params: Partial<GetProductTypeParams>,
): Promise<GetProductTypeReturn | null> {
	const validation = getProductTypeSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	return fetchProductType(validation.data.slug);
}

async function fetchProductType(slug: string): Promise<GetProductTypeReturn | null> {
	"use cache";
	cacheProductTypeDetail(slug);

	try {
		return await prisma.productType.findUnique({
			where: { slug },
			select: GET_PRODUCT_TYPE_SELECT,
		});
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductType" },
			extra: { slug },
		});
		throw error;
	}
}

// ============================================================================
// DETAIL — page admin enrichie (5 derniers produits + counts)
// ============================================================================

export type ProductTypeDetailReturn = NonNullable<
	Awaited<ReturnType<typeof fetchProductTypeDetail>>
>;

export async function getProductTypeDetailBySlug(
	params: Partial<GetProductTypeParams>,
): Promise<ProductTypeDetailReturn | null> {
	const validation = getProductTypeSchema.safeParse(params);

	if (!validation.success) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	return fetchProductTypeDetail(validation.data.slug);
}

async function fetchProductTypeDetail(slug: string) {
	"use cache";
	cacheProductTypeDetail(slug);

	try {
		return await prisma.productType.findUnique({
			where: { slug },
			select: {
				id: true,
				slug: true,
				label: true,
				position: true,
				products: {
					take: 5,
					orderBy: { updatedAt: "desc" },
					select: {
						id: true,
						slug: true,
						name: true,
						active: true,
						priceCents: true,
						// Vignette unique : filtre IMAGE + ordre canonique, l'appelant
						// prend `media[0]` sans pouvoir trier.
						media: {
							where: { type: "IMAGE" as const },
							orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
							take: 1,
							select: { url: true, alt: true },
						},
					},
				},
				_count: { select: { products: true } },
			},
		});
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductTypeDetail" },
			extra: { slug },
		});
		throw error;
	}
}

// ============================================================================
// PRODUCT COUNTS — pour stats card (actifs / brouillons)
// ============================================================================

export async function getProductTypeProductCounts(productTypeId: string) {
	const admin = await isAdmin();
	if (!admin) return { active: 0, draft: 0 };

	return fetchProductTypeProductCounts(productTypeId);
}

async function fetchProductTypeProductCounts(productTypeId: string) {
	"use cache";
	cacheProductTypeCounts(productTypeId);

	try {
		const [active, draft] = await Promise.all([
			prisma.product.count({ where: { typeId: productTypeId, active: true } }),
			prisma.product.count({ where: { typeId: productTypeId, active: false } }),
		]);

		return { active, draft };
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductTypeProductCounts" },
			extra: { productTypeId },
		});
		throw error;
	}
}
