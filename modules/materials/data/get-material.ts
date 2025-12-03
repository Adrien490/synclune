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

	return fetchMaterial(validation.data, { admin });
}

/**
 * Récupère le matériau depuis la DB avec cache
 * Utilise findFirst pour pouvoir filtrer par isActive
 */
async function fetchMaterial(
	params: GetMaterialParams,
	context: { admin: boolean }
): Promise<GetMaterialReturn | null> {
	"use cache";
	cacheMaterialDetail(params.slug);

	const includeInactive = context.admin
		? params.includeInactive === true
		: false;

	const where: Prisma.MaterialWhereInput = {
		slug: params.slug,
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
	} catch {
		return null;
	}
}
