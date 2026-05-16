/**
 * Types pour le module colors
 *
 * @module modules/colors/types
 */

import { type Prisma } from "@/app/generated/prisma/client";
import type { z } from "zod";
import type { colorFiltersSchema, getColorsSchema, getColorSchema } from "../schemas/color.schemas";
import type { GET_COLORS_SELECT, GET_COLOR_SELECT } from "../constants/color.constants";
import type { PaginationInfo } from "@/shared/lib/pagination";

// ============================================================================
// COLOR OPTIONS (pour selects/filtres)
// ============================================================================

/** Option de couleur pour les selects/filtres */
export interface ColorOption {
	id: string;
	name: string;
	hex: string;
}

// ============================================================================
// GET COLORS TYPES
// ============================================================================

/** Paramètres validés pour getColors */
export type GetColorsParams = z.infer<typeof getColorsSchema>;

/** Paramètres d'entrée pour getColors (avant validation) */
export type GetColorsParamsInput = z.input<typeof getColorsSchema>;

/** Filtres pour getColors */
export type ColorFilters = z.infer<typeof colorFiltersSchema>;

/**
 * Le shape retourné par `getColors` est volontairement remappé pour préserver
 * l'API publique stable (`_count.skus`) côté consumers UI, malgré le rename
 * interne de la relation Prisma en `skuColors` (M2M depuis 2026-05-15).
 */
export type Color = Omit<Prisma.ColorGetPayload<{ select: typeof GET_COLORS_SELECT }>, "_count"> & {
	_count: { skus: number };
};

/** Retour de getColors */
export interface GetColorsReturn {
	colors: Color[];
	pagination: PaginationInfo;
	totalCount: number;
}

// ============================================================================
// GET COLOR TYPES
// ============================================================================

/** Paramètres pour getColor */
export type GetColorParams = z.infer<typeof getColorSchema>;

/** Retour de getColor */
export type GetColorReturn = Prisma.ColorGetPayload<{
	select: typeof GET_COLOR_SELECT;
}>;
