import * as Sentry from "@sentry/nextjs";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { cacheProductTypeCounts, cacheProductTypeDetail } from "../constants/cache";

import { GET_PRODUCT_TYPE_SELECT } from "../constants/product-type.constants";
import { getProductTypeSchema } from "../schemas/product-type.schemas";
import type { GetProductTypeParams, GetProductTypeReturn } from "../types/product-type.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un type de produit par son slug
 */
export async function getProductTypeBySlug(
	params: Partial<GetProductTypeParams>,
): Promise<GetProductTypeReturn | null> {
	const validation = getProductTypeSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();
	const includeInactive = admin && validation.data.includeInactive === true;

	return fetchProductType(validation.data.slug, includeInactive);
}

/**
 * Récupère le type de produit depuis la DB avec cache
 * includeInactive is a separate param to ensure distinct cache keys between admin/public
 */
async function fetchProductType(
	slug: string,
	includeInactive: boolean,
): Promise<GetProductTypeReturn | null> {
	"use cache";
	cacheProductTypeDetail(slug);

	try {
		const productType = await prisma.productType.findUnique({
			where: { slug },
			select: GET_PRODUCT_TYPE_SELECT,
		});

		if (!productType) return null;
		if (!includeInactive && !productType.isActive) return null;

		return productType;
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductType" },
			extra: { slug, includeInactive },
		});
		throw error;
	}
}

// ============================================================================
// DETAIL — page admin enrichie (5 derniers produits + counts par statut)
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
				description: true,
				isActive: true,
				isSystem: true,
				createdAt: true,
				updatedAt: true,
				products: {
					take: 5,
					orderBy: { updatedAt: "desc" },
					select: {
						id: true,
						slug: true,
						title: true,
						status: true,
						skus: {
							where: { isDefault: true },
							take: 1,
							select: {
								images: {
									where: { isPrimary: true },
									take: 1,
									select: { url: true, blurDataUrl: true, altText: true },
								},
							},
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
// PRODUCT COUNTS BY STATUS — pour stats card
// ============================================================================

export async function getProductTypeProductCounts(productTypeId: string) {
	const admin = await isAdmin();
	if (!admin) return { public: 0, draft: 0, archived: 0 };

	return fetchProductTypeProductCounts(productTypeId);
}

async function fetchProductTypeProductCounts(productTypeId: string) {
	"use cache";
	cacheProductTypeCounts(productTypeId);

	try {
		const grouped = await prisma.product.groupBy({
			by: ["status"],
			where: { typeId: productTypeId, deletedAt: null },
			_count: { _all: true },
		});

		const findCount = (status: "PUBLIC" | "DRAFT" | "ARCHIVED") =>
			grouped.find((g) => g.status === status)?._count._all ?? 0;

		return {
			public: findCount("PUBLIC"),
			draft: findCount("DRAFT"),
			archived: findCount("ARCHIVED"),
		};
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductTypeProductCounts" },
			extra: { productTypeId },
		});
		throw error;
	}
}
