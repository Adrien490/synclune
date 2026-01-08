import { prisma } from "@/shared/lib/prisma";
import { cacheColors } from "../constants/cache";
import type { ColorOption } from "../types/color.types";

// Re-export pour compatibilité
export type { ColorOption };

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère toutes les couleurs pour les selects/filtres
 * Version simplifiée sans pagination
 */
export async function getColorOptions(): Promise<ColorOption[]> {
	return fetchColorOptions();
}

/**
 * Récupère les couleurs pour les selects depuis la DB avec cache
 */
async function fetchColorOptions(): Promise<ColorOption[]> {
	"use cache";
	cacheColors();

	try {
		const colors = await prisma.color.findMany({
			select: {
				id: true,
				name: true,
				hex: true,
			},
			orderBy: { name: "asc" },
		});

		return colors;
	} catch (error) {
		if (error instanceof Error) {
			console.error(`[getColorOptions] ${error.name}: ${error.message}`);
		}
		return [];
	}
}
