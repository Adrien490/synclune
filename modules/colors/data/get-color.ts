import { type Prisma } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { cacheLife, cacheTag } from "next/cache";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { cacheColorDetail } from "../constants/cache";

import { GET_COLOR_SELECT } from "../constants/color.constants";
import { getColorSchema } from "../schemas/color.schemas";
import type { GetColorParams, GetColorReturn } from "../types/color.types";

// Re-export pour compatibilité
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère une couleur par son slug
 * - Admin : peut voir les couleurs inactives si includeInactive=true
 * - Non-admin : ne voit que les couleurs actives
 */
export async function getColorBySlug(
	params: Partial<GetColorParams>,
): Promise<GetColorReturn | null> {
	const validation = getColorSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();
	const includeInactive = admin && validation.data.includeInactive === true;

	return fetchColor(validation.data.slug, includeInactive);
}

/**
 * Récupère la couleur depuis la DB avec cache
 * Utilise findFirst pour pouvoir filtrer par isActive
 * includeInactive is a separate param to ensure distinct cache keys between admin/public
 */
async function fetchColor(slug: string, includeInactive: boolean): Promise<GetColorReturn | null> {
	"use cache";
	cacheColorDetail(slug);

	const where: Prisma.ColorWhereInput = {
		slug,
	};

	if (!includeInactive) {
		where.isActive = true;
	}

	try {
		const color = await prisma.color.findFirst({
			where,
			select: GET_COLOR_SELECT,
		});

		return color;
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "colors", operation: "fetchColorBySlug" },
		});
		return null;
	}
}

// ============================================================================
// DETAIL — page admin enrichie (10 SKU actifs + count + produits distincts)
// ============================================================================

export type ColorDetailReturn = NonNullable<Awaited<ReturnType<typeof fetchColorDetail>>>;

export async function getColorDetailBySlug(slug: string): Promise<ColorDetailReturn | null> {
	if (!slug) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	return fetchColorDetail(slug);
}

async function fetchColorDetail(slug: string) {
	"use cache";
	cacheColorDetail(slug);

	try {
		const raw = await prisma.color.findFirst({
			where: { slug },
			select: {
				id: true,
				slug: true,
				name: true,
				hex: true,
				description: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
				// Liens M2M actifs avec SKU joint (préserve l'ancien shape `skus[]`)
				skuColors: {
					where: { sku: { isActive: true } },
					take: 10,
					orderBy: { sku: { product: { title: "asc" } } },
					select: {
						sku: {
							select: {
								id: true,
								sku: true,
								size: true,
								priceInclTax: true,
								isDefault: true,
								inventory: true,
								materials: {
									select: {
										materialId: true,
										position: true,
										material: { select: { name: true, slug: true } },
									},
									orderBy: { position: "asc" },
								},
								product: {
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
							},
						},
					},
				},
				_count: { select: { skuColors: { where: { sku: { isActive: true } } } } },
			},
		});

		if (!raw) return null;

		// Remap pour préserver l'ancien shape consommé par l'UI :
		// `_count.skus` + `skus[]` (au lieu de `_count.skuColors` + `skuColors[].sku`).
		const { skuColors, _count, ...rest } = raw;
		return {
			...rest,
			skus: skuColors.map((link) => link.sku),
			_count: { skus: _count.skuColors },
		};
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "colors", operation: "fetchColorDetail" },
			extra: { slug },
		});
		return null;
	}
}

export async function getColorDistinctProductCount(colorId: string): Promise<number> {
	const admin = await isAdmin();
	if (!admin) return 0;

	return fetchColorDistinctProductCount(colorId);
}

/**
 * Cached fetcher for the admin "produits distincts" KPI on the color detail
 * page. Profile `user` (2 min stale / 1 min revalidate) is appropriate since
 * this is admin-only data that becomes stale after SKU mutations affecting
 * this color (handled via cross-module tag invalidation when SKUs move).
 */
async function fetchColorDistinctProductCount(colorId: string): Promise<number> {
	"use cache";
	cacheLife("user");
	cacheTag(`color-${colorId}-product-count`);

	try {
		// M2M : on cherche les SKUs actifs liés à cette couleur via la jointure
		const result = await prisma.productSku.findMany({
			where: {
				isActive: true,
				colors: { some: { colorId } },
			},
			select: { productId: true },
			distinct: ["productId"],
		});
		return result.length;
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "colors", operation: "getColorDistinctProductCount" },
			extra: { colorId },
		});
		return 0;
	}
}
