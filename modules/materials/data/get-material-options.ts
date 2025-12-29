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
			},
			orderBy: { name: "asc" },
		});

		return materials;
	} catch {
		return [];
	}
}
