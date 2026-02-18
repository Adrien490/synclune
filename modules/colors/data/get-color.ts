import { Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { cacheColorDetail } from "../constants/cache";

import { GET_COLOR_SELECT } from "../constants/color.constants";
import { getColorSchema } from "../schemas/color.schemas";
import type { GetColorParams, GetColorReturn } from "../types/color.types";

// Re-export pour compatibilité
export type { GetColorParams, GetColorReturn } from "../types/color.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère une couleur par son slug
 * - Admin : peut voir les couleurs inactives si includeInactive=true
 * - Non-admin : ne voit que les couleurs actives
 */
export async function getColorBySlug(
	params: Partial<GetColorParams>
): Promise<GetColorReturn | null> {
	const validation = getColorSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();
	const includeInactive = admin && validation.data.includeInactive === true;

	return fetchColor(validation.data.slug, includeInactive);
}

/**
 * Récupère la couleur depuis la DB avec cache
 * Utilise findFirst pour pouvoir filtrer par isActive
 * includeInactive is a separate param to ensure distinct cache keys between admin/public
 */
async function fetchColor(
	slug: string,
	includeInactive: boolean
): Promise<GetColorReturn | null> {
	"use cache";
	cacheColorDetail(slug);

	const where: Prisma.ColorWhereInput = {
		slug,
	};

	if (!includeInactive) {
		where.isActive = true;
	}

	try {
		const color = await prisma.color.findFirst({
			where,
			select: GET_COLOR_SELECT,
		});

		return color;
	} catch (error) {
		if (error instanceof Error) {
			console.error(`[getColorBySlug] ${error.name}: ${error.message}`);
		}
		return null;
	}
}
