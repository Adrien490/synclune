import { type Prisma } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { cacheLife, cacheTag } from "next/cache";

import { isAdmin } from "@/modules/auth/utils/guards";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

import { cacheMaterialDetail } from "../constants/cache";

import { GET_MATERIAL_SELECT } from "../constants/materials.constants";
import { getMaterialSchema } from "../schemas/materials.schemas";
import type { GetMaterialParams, GetMaterialReturn } from "../types/materials.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un matériau par son slug
 * - Admin : peut voir les matériaux inactifs si includeInactive=true
 * - Non-admin : ne voit que les matériaux actifs
 */
export async function getMaterialBySlug(
	params: Partial<GetMaterialParams>,
): Promise<GetMaterialReturn | null> {
	const validation = getMaterialSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();
	const includeInactive = admin && validation.data.includeInactive === true;

	return fetchMaterial(validation.data.slug, includeInactive);
}

/**
 * Récupère le matériau depuis la DB avec cache
 * Utilise findFirst pour pouvoir filtrer par isActive
 * includeInactive is a separate param to ensure distinct cache keys between admin/public
 */
async function fetchMaterial(
	slug: string,
	includeInactive: boolean,
): Promise<GetMaterialReturn | null> {
	"use cache";
	cacheMaterialDetail(slug);

	const where: Prisma.MaterialWhereInput = {
		slug,
	};

	if (!includeInactive) {
		where.isActive = true;
	}

	try {
		const material = await prisma.material.findFirst({
			where,
			select: GET_MATERIAL_SELECT,
		});

		return material;
	} catch (error) {
		logger.error("Failed to fetch material", error, { service: "fetchMaterial" });
		return null;
	}
}

// ============================================================================
// DETAIL — page admin enrichie (10 SKU actifs + count + produits distincts)
// ============================================================================

export type MaterialDetailReturn = NonNullable<Awaited<ReturnType<typeof fetchMaterialDetail>>>;

export async function getMaterialDetailBySlug(slug: string): Promise<MaterialDetailReturn | null> {
	const admin = await isAdmin();
	if (!admin) return null;

	return fetchMaterialDetail(slug);
}

async function fetchMaterialDetail(slug: string) {
	"use cache";
	cacheMaterialDetail(slug);

	try {
		const raw = await prisma.material.findFirst({
			where: { slug },
			select: {
				id: true,
				slug: true,
				name: true,
				description: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
				// Liens M2M actifs avec SKU joint (preserve l'ancien shape `skus[]`)
				skuMaterials: {
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
								colors: {
									select: {
										colorId: true,
										position: true,
										color: { select: { name: true, hex: true, slug: true } },
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
				_count: { select: { skuMaterials: { where: { sku: { isActive: true } } } } },
			},
		});

		if (!raw) return null;

		// Remap pour préserver l'ancien shape consommé par l'UI :
		// `_count.skus` + `skus[]` (au lieu de `_count.skuMaterials` + `skuMaterials[].sku`).
		const { skuMaterials, _count, ...rest } = raw;
		return {
			...rest,
			skus: skuMaterials.map((link) => link.sku),
			_count: { skus: _count.skuMaterials },
		};
	} catch (error) {
		logger.error("Failed to fetch material detail", error, { service: "fetchMaterialDetail" });
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
 * page. Profile `user` (2 min stale / 1 min revalidate) is appropriate since
 * this is admin-only data that becomes stale after SKU mutations affecting
 * this material (handled via cross-module tag invalidation when SKUs move).
 */
async function fetchMaterialDistinctProductCount(materialId: string): Promise<number> {
	"use cache";
	cacheLife("user");
	cacheTag(`material-${materialId}-product-count`);

	try {
		// M2M : on cherche les SKUs actifs liés à ce matériau via la jointure
		const result = await prisma.productSku.findMany({
			where: {
				isActive: true,
				materials: { some: { materialId } },
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
