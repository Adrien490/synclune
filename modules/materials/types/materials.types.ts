import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import {
	type GET_MATERIALS_SELECT,
	type GET_MATERIAL_SELECT,
} from "../constants/materials.constants";
import { type getMaterialsSchema, type getMaterialSchema } from "../schemas/materials.schemas";

// ============================================================================
// FUNCTION TYPES - LIST
// ============================================================================

export type GetMaterialsParamsInput = z.input<typeof getMaterialsSchema>;

export type GetMaterialsParams = z.output<typeof getMaterialsSchema>;

export type GetMaterialsReturn = {
	materials: Array<Prisma.MaterialGetPayload<{ select: typeof GET_MATERIALS_SELECT }>>;
	pagination: PaginationInfo;
	totalCount: number;
};

export type MaterialFilters = z.input<typeof getMaterialsSchema>["filters"];

// ============================================================================
// FUNCTION TYPES - SINGLE
// ============================================================================

export type GetMaterialParams = z.infer<typeof getMaterialSchema>;

export type GetMaterialReturn = Prisma.MaterialGetPayload<{
	select: typeof GET_MATERIAL_SELECT;
}>;

// ============================================================================
// OPTIONS TYPES (for selects/filters)
// ============================================================================

/**
 * Matériau simplifié pour les selects/filtres
 */
export type MaterialOption = {
	id: string;
	name: string;
	slug: string;
	_count?: {
		skus: number;
	};
};
