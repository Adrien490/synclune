import { type Prisma } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { cacheLife, cacheTag } from "next/cache";

import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma } from "@/shared/lib/prisma";

import { cacheColorDetail, COLORS_CACHE_TAGS } from "../constants/cache";

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
				// Liens M2M actifs avec SKU joint (préserve l'ancien shape `skus[]`).
				// `deletedAt: null` : le soft delete produit pose deletedAt sur les SKUs
				// SANS toucher isActive — sans ce filtre, la carte listait des variantes
				// fantômes de produits supprimés (liens morts).
				skuColors: {
					where: { sku: { isActive: true, deletedAt: null } },
					take: 10,
					orderBy: { sku: { product: { title: "asc" } } },
					select: {
						sku: {
							select: {
								id: true,
								sku: true,
								size: true,
								priceInclTax: true,
								// V5 : `isDefault` → `position` (rang 0 = représentant du produit) ;
								// la carte d'usage badge la variante de rang 0.
								position: true,
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
										// Vignette unique : l'appelant prend `skus[0].images[0]` sans
										// pouvoir trier, donc le tri se fait ici.
										//
										// On ordonne au lieu de filtrer (motif banni par CLAUDE.md : un
										// filtre « défaut »/« primaire » rendait 0 image alors qu'il y en a).
										// V5 : ordres canoniques `(position asc, id asc)` — le SKU de rang 0
										// est le représentant, la première IMAGE le média principal.
										// Et `mediaType: "IMAGE"` est obligatoire ici : sans lui un `.mp4`
										// atterrit dans `<Image src>` (vignette cassée + transformation
										// `/_next/image` facturée). Même pattern que get-material.ts.
										skus: {
											where: { isActive: true, deletedAt: null },
											orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
											take: 1,
											select: {
												images: {
													where: { mediaType: "IMAGE" as const },
													orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
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
				_count: { select: { skuColors: { where: { sku: { isActive: true, deletedAt: null } } } } },
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
	cacheTag(COLORS_CACHE_TAGS.PRODUCT_COUNT(colorId));

	try {
		// M2M : on cherche les SKUs actifs liés à cette couleur via la jointure.
		// `deletedAt: null` : sans lui, le KPI comptait les produits soft-deleted.
		const result = await prisma.productSku.findMany({
			where: {
				isActive: true,
				deletedAt: null,
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
