import * as Sentry from "@sentry/nextjs";
import { cacheLife, cacheTag } from "next/cache";

import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma } from "@/shared/lib/prisma";

import { cacheColorDetail, COLORS_CACHE_TAGS } from "../constants/cache";

import { GET_COLOR_SELECT } from "../constants/color.constants";
import { getColorSchema } from "../schemas/color.schemas";
import type { GetColorParams, GetColorReturn } from "../types/color.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère une couleur par son id — schéma lean : Color n'a plus de slug ni de
 * statut, l'identité admin est l'ID.
 */
export async function getColorById(
	params: Partial<GetColorParams>,
): Promise<GetColorReturn | null> {
	const validation = getColorSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	return fetchColor(validation.data.id);
}

async function fetchColor(id: string): Promise<GetColorReturn | null> {
	"use cache";
	cacheColorDetail(id);

	try {
		return await prisma.color.findUnique({
			where: { id },
			select: GET_COLOR_SELECT,
		});
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "colors", operation: "fetchColorById" },
		});
		return null;
	}
}

// ============================================================================
// DETAIL — page admin enrichie (10 variantes actives + count + produits distincts)
// ============================================================================

export type ColorDetailReturn = NonNullable<Awaited<ReturnType<typeof fetchColorDetail>>>;

export async function getColorDetailById(id: string): Promise<ColorDetailReturn | null> {
	if (!id) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	return fetchColorDetail(id);
}

async function fetchColorDetail(id: string) {
	"use cache";
	cacheColorDetail(id);

	try {
		// Deux comptages coexistent, et ils ne comptent PAS la même chose :
		// `_count.variants` alimente le KPI « Variantes actives » de la carte de
		// statistiques, `totalVariantCount` la garde de suppression — la FK
		// est en ON DELETE RESTRICT, une variante INACTIVE bloque tout autant.
		const [color, totalVariantCount] = await Promise.all([
			prisma.color.findUnique({
				where: { id },
				select: {
					id: true,
					name: true,
					hex: true,
					position: true,
					// Variantes actives qui portent cette couleur (FK simple depuis le lean).
					variants: {
						where: { active: true },
						take: 10,
						orderBy: { product: { name: "asc" } },
						select: {
							id: true,
							size: true,
							priceCents: true,
							stock: true,
							material: { select: { id: true, name: true } },
							product: {
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
						},
					},
					_count: { select: { variants: { where: { active: true } } } },
				},
			}),
			prisma.productVariant.count({ where: { colorId: id } }),
		]);

		if (!color) return null;

		return { ...color, totalVariantCount };
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "colors", operation: "fetchColorDetail" },
			extra: { id },
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
 * page.
 */
async function fetchColorDistinctProductCount(colorId: string): Promise<number> {
	"use cache";
	cacheLife("user");
	cacheTag(COLORS_CACHE_TAGS.PRODUCT_COUNT(colorId));

	try {
		const result = await prisma.productVariant.findMany({
			where: {
				active: true,
				colorId,
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
