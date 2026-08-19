import * as Sentry from "@sentry/nextjs";
import { cacheLife, cacheTag } from "next/cache";

import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma } from "@/shared/lib/prisma";

import { cacheMaterialDetail, MATERIALS_CACHE_TAGS } from "../constants/cache";

import { GET_MATERIAL_SELECT } from "../constants/materials.constants";
import { getMaterialSchema } from "../schemas/materials.schemas";
import type { GetMaterialParams, GetMaterialReturn } from "../types/materials.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un matériau par son id — schéma lean : Material n'a plus de slug ni
 * de statut, l'identité admin est l'ID.
 */
export async function getMaterialById(
	params: Partial<GetMaterialParams>,
): Promise<GetMaterialReturn | null> {
	const validation = getMaterialSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	return fetchMaterial(validation.data.id);
}

async function fetchMaterial(id: string): Promise<GetMaterialReturn | null> {
	"use cache";
	cacheMaterialDetail(id);

	try {
		return await prisma.material.findUnique({
			where: { id },
			select: GET_MATERIAL_SELECT,
		});
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "materials", operation: "fetchMaterialById" },
		});
		return null;
	}
}

// ============================================================================
// DETAIL — page admin enrichie (10 variantes actives + count)
// ============================================================================

export type MaterialDetailReturn = NonNullable<Awaited<ReturnType<typeof fetchMaterialDetail>>>;

export async function getMaterialDetailById(id: string): Promise<MaterialDetailReturn | null> {
	if (!id) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	return fetchMaterialDetail(id);
}

async function fetchMaterialDetail(id: string) {
	"use cache";
	cacheMaterialDetail(id);

	try {
		// Deux comptages coexistent, et ils ne comptent PAS la même chose :
		// `_count.variants` alimente le KPI « Variantes actives » de la carte de
		// statistiques, `totalVariantCount` la garde de suppression — la FK
		// est en ON DELETE RESTRICT, une variante INACTIVE bloque tout autant.
		const [material, totalVariantCount] = await Promise.all([
			prisma.material.findUnique({
				where: { id },
				select: {
					id: true,
					name: true,
					position: true,
					// Variantes actives qui portent ce matériau (FK simple depuis le lean).
					variants: {
						where: { active: true },
						take: 10,
						orderBy: { product: { name: "asc" } },
						select: {
							id: true,
							size: true,
							priceCents: true,
							stock: true,
							color: { select: { id: true, name: true, hex: true } },
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
			prisma.productVariant.count({ where: { materialId: id } }),
		]);

		if (!material) return null;

		return { ...material, totalVariantCount };
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "materials", operation: "fetchMaterialDetail" },
			extra: { id },
		});
		return null;
	}
}

export async function getMaterialDistinctProductCount(materialId: string): Promise<number> {
	const admin = await isAdmin();
	if (!admin) return 0;

	return fetchMaterialDistinctProductCount(materialId);
}

/**
 * Cached fetcher for the admin "produits distincts" KPI on the material detail
 * page.
 */
async function fetchMaterialDistinctProductCount(materialId: string): Promise<number> {
	"use cache";
	cacheLife("user");
	cacheTag(MATERIALS_CACHE_TAGS.PRODUCT_COUNT(materialId));

	try {
		const result = await prisma.productVariant.findMany({
			where: {
				active: true,
				materialId,
			},
			select: { productId: true },
			distinct: ["productId"],
		});
		return result.length;
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "materials", operation: "getMaterialDistinctProductCount" },
			extra: { materialId },
		});
		return 0;
	}
}
