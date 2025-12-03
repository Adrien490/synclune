import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_COLORS_SELECT,
	GET_COLOR_SELECT,
} from "../constants/color.constants";
import {
	getColorsSchema,
	getColorSchema,
	createColorSchema,
	updateColorSchema,
	deleteColorSchema,
	bulkDeleteColorsSchema,
} from "../schemas/color.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type ColorFilters = z.infer<
	typeof import("../schemas/color.schemas").colorFiltersSchema
>;

// ============================================================================
// FUNCTION TYPES - LIST
// ============================================================================

export type GetColorsParamsInput = z.input<typeof getColorsSchema>;

export type GetColorsParams = z.output<typeof getColorsSchema>;

export type GetColorsReturn = {
	colors: Array<Prisma.ColorGetPayload<{ select: typeof GET_COLORS_SELECT }>>;
	pagination: PaginationInfo;
};

// ============================================================================
// FUNCTION TYPES - SINGLE
// ============================================================================

export type GetColorParams = z.infer<typeof getColorSchema>;

export type GetColorReturn = Prisma.ColorGetPayload<{
	select: typeof GET_COLOR_SELECT;
}>;

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type Color = Prisma.ColorGetPayload<{
	select: typeof GET_COLORS_SELECT;
}>;

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateColorInput = z.infer<typeof createColorSchema>;
export type UpdateColorInput = z.infer<typeof updateColorSchema>;
export type DeleteColorInput = z.infer<typeof deleteColorSchema>;
export type BulkDeleteColorsInput = z.infer<typeof bulkDeleteColorsSchema>;
