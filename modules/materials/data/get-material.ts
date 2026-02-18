import { Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { cacheMaterialDetail } from "../constants/cache";

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
 * - Admin : peut voir les matériaux inactifs si includeInactive=true
 * - Non-admin : ne voit que les matériaux actifs
 */
export async function getMaterialBySlug(
	params: Partial<GetMaterialParams>
): Promise<GetMaterialReturn | null> {
	const validation = getMaterialSchema.safeParse(params ?? {});

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
	includeInactive: boolean
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
		console.error("[GET_MATERIAL]", error);
		return null;
	}
}
