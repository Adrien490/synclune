import { prisma } from "@/shared/lib/prisma";

import { cacheColors } from "../constants/cache";

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
 */
export async function getColorBySlug(
	params: Partial<GetColorParams>
): Promise<GetColorReturn | null> {
	const validation = getColorSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	return fetchColor(validation.data);
}

/**
 * Récupère la couleur depuis la DB avec cache
 * Utilise findUnique pour exploiter l'index unique sur slug
 */
async function fetchColor(
	params: GetColorParams
): Promise<GetColorReturn | null> {
	"use cache";
	cacheColors();

	try {
		const color = await prisma.color.findUnique({
			where: { slug: params.slug },
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
