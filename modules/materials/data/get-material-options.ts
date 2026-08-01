import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { cacheMaterials } from "../constants/cache";
import type { MaterialOption } from "../types/materials.types";

export type { MaterialOption } from "../types/materials.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère tous les matériaux actifs pour les selects/filtres
 * Version simplifiée sans pagination
 */
export async function getMaterialOptions(): Promise<MaterialOption[]> {
	return fetchMaterialOptions();
}

/**
 * Récupère les matériaux pour les selects depuis la DB avec cache
 */
async function fetchMaterialOptions(): Promise<MaterialOption[]> {
	"use cache";
	cacheMaterials();

	try {
		const materials = await prisma.material.findMany({
			where: { isActive: true },
			select: {
				id: true,
				name: true,
				slug: true,
				// _count.skuMaterials avec filtre nested `sku.isActive: true`
				// = nombre de SKUs actifs utilisant ce matériau (M2M).
				// `deletedAt: null` : le soft delete produit pose deletedAt sur les SKUs
				// SANS toucher isActive — sans lui le compte incluait des fantômes.
				_count: {
					select: {
						skuMaterials: {
							where: { sku: { isActive: true, deletedAt: null } },
						},
					},
				},
			},
			orderBy: { name: "asc" },
		});

		// Renvoyer le shape historique { _count: { skus: number } } pour ne pas
		// casser les callers (UI affiche le nombre d'utilisations en filtre/select).
		return materials.map((m) => ({
			id: m.id,
			name: m.name,
			slug: m.slug,
			_count: { skus: m._count.skuMaterials },
		}));
	} catch (e) {
		Sentry.captureException(e, {
			tags: { module: "materials", operation: "fetchMaterialOptions" },
		});
		return [];
	}
}
