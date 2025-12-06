import { prisma } from "@/shared/lib/prisma";
import { cacheColors } from "../constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type ColorOption = {
	id: string;
	name: string;
	hex: string;
};

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
	} catch {
		return [];
	}
}
