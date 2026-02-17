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

	return fetchColor(validation.data, { admin });
}

/**
 * Récupère la couleur depuis la DB avec cache
 * Utilise findFirst pour pouvoir filtrer par isActive
 */
async function fetchColor(
	params: GetColorParams,
	context: { admin: boolean }
): Promise<GetColorReturn | null> {
	"use cache";
	cacheColorDetail(params.slug);

	const includeInactive = context.admin
		? params.includeInactive === true
		: false;

	const where: Prisma.ColorWhereInput = {
		slug: params.slug,
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
