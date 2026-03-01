import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import {
	type GET_MATERIALS_SELECT,
	type GET_MATERIAL_SELECT,
} from "../constants/materials.constants";
import {
	type getMaterialsSchema,
	type getMaterialSchema,
	type createMaterialSchema,
	type updateMaterialSchema,
	type deleteMaterialSchema,
	type bulkDeleteMaterialsSchema,
	type toggleMaterialStatusSchema,
	type bulkToggleMaterialStatusSchema,
	type duplicateMaterialSchema,
	type materialFiltersSchema,
} from "../schemas/materials.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type MaterialFilters = z.infer<typeof materialFiltersSchema>;

// ============================================================================
// FUNCTION TYPES - LIST
// ============================================================================

export type GetMaterialsParamsInput = z.input<typeof getMaterialsSchema>;

export type GetMaterialsParams = z.output<typeof getMaterialsSchema>;

export type GetMaterialsReturn = {
	materials: Array<Prisma.MaterialGetPayload<{ select: typeof GET_MATERIALS_SELECT }>>;
	pagination: PaginationInfo;
};

// ============================================================================
// FUNCTION TYPES - SINGLE
// ============================================================================

export type GetMaterialParams = z.infer<typeof getMaterialSchema>;

export type GetMaterialReturn = Prisma.MaterialGetPayload<{
	select: typeof GET_MATERIAL_SELECT;
}>;

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type Material = Prisma.MaterialGetPayload<{
	select: typeof GET_MATERIALS_SELECT;
}>;

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type DeleteMaterialInput = z.infer<typeof deleteMaterialSchema>;
export type BulkDeleteMaterialsInput = z.infer<typeof bulkDeleteMaterialsSchema>;
export type ToggleMaterialStatusInput = z.infer<typeof toggleMaterialStatusSchema>;
export type BulkToggleMaterialStatusInput = z.infer<typeof bulkToggleMaterialStatusSchema>;
export type DuplicateMaterialInput = z.infer<typeof duplicateMaterialSchema>;

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
