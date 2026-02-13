/**
 * Types pour le module colors
 *
 * @module modules/colors/types
 */

import { Prisma } from "@/app/generated/prisma/client";
import type { z } from "zod";
import type {
	colorFiltersSchema,
	getColorsSchema,
	getColorSchema,
} from "../schemas/color.schemas";
import type {
	GET_COLORS_SELECT,
	GET_COLOR_SELECT,
} from "../constants/color.constants";
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

/** Couleur avec count de SKUs */
export type Color = Prisma.ColorGetPayload<{
	select: typeof GET_COLORS_SELECT;
}>;

/** Retour de getColors */
export interface GetColorsReturn {
	colors: Color[];
	pagination: PaginationInfo;
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
