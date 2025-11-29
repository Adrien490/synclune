import { prisma } from "@/shared/lib/prisma";

import { cacheMaterials } from "../constants/cache";

import { GET_MATERIAL_SELECT } from "../constants/materials.constants";
import { getMaterialSchema } from "../schemas/materials.schemas";
import type { GetMaterialParams, GetMaterialReturn } from "../types/materials.types";

// Re-export pour compatibilité
export type { GetMaterialParams, GetMaterialReturn } from "../types/materials.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un matériau par son slug
 */
export async function getMaterialBySlug(
	params: Partial<GetMaterialParams>
): Promise<GetMaterialReturn | null> {
	const validation = getMaterialSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	return fetchMaterial(validation.data);
}

/**
 * Récupère le matériau depuis la DB avec cache
 * Utilise findUnique pour exploiter l'index unique sur slug
 */
async function fetchMaterial(
	params: GetMaterialParams
): Promise<GetMaterialReturn | null> {
	"use cache";
	cacheMaterials();

	try {
		const material = await prisma.material.findUnique({
			where: { slug: params.slug },
			select: GET_MATERIAL_SELECT,
		});

		return material;
	} catch {
		return null;
	}
}
