import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { cacheMaterials } from "../constants/cache";
import type { MaterialOption } from "../types/materials.types";

export type { MaterialOption } from "../types/materials.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère tous les matériaux pour les selects/filtres
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
		return await prisma.material.findMany({
			select: {
				id: true,
				name: true,
				_count: {
					select: {
						variants: { where: { active: true } },
					},
				},
			},
			orderBy: [{ position: "asc" }, { name: "asc" }],
		});
	} catch (e) {
		Sentry.captureException(e, {
			tags: { module: "materials", operation: "fetchMaterialOptions" },
		});
		return [];
	}
}
