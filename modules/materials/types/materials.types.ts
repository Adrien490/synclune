import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_MATERIALS_SELECT,
	GET_MATERIAL_SELECT,
} from "../constants/materials.constants";
import {
	getMaterialsSchema,
	getMaterialSchema,
	createMaterialSchema,
	updateMaterialSchema,
	deleteMaterialSchema,
	bulkDeleteMaterialsSchema,
	toggleMaterialStatusSchema,
} from "../schemas/materials.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type MaterialFilters = z.infer<
	typeof import("../schemas/materials.schemas").materialFiltersSchema
>;

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
