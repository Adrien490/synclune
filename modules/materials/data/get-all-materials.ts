import { prisma } from "@/shared/lib/prisma";

import { cacheMaterials } from "../constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type MaterialOption = {
	id: string;
	slug: string;
	name: string;
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère tous les matériaux actifs pour les selects
 */
export async function getAllMaterials(): Promise<MaterialOption[]> {
	return fetchAllMaterials();
}

/**
 * Récupère tous les matériaux depuis la DB avec cache
 */
async function fetchAllMaterials(): Promise<MaterialOption[]> {
	"use cache";
	cacheMaterials();

	try {
		const materials = await prisma.material.findMany({
			where: { isActive: true },
			select: {
				id: true,
				slug: true,
				name: true,
			},
			orderBy: { name: "asc" },
		});

		return materials;
	} catch {
		return [];
	}
}
