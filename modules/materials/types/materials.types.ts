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

/**
 * Le shape retourné par `getMaterials` est volontairement remappé pour préserver
 * l'API publique stable (`_count.skus`) côté consumers UI, malgré le rename
 * interne de la relation Prisma en `skuMaterials` (M2M depuis 2026-05-14).
 */
type MaterialListItem = Omit<
	Prisma.MaterialGetPayload<{ select: typeof GET_MATERIALS_SELECT }>,
	"_count"
> & {
	_count: { skus: number };
};

export type GetMaterialsReturn = {
	materials: MaterialListItem[];
	pagination: PaginationInfo;
	totalCount: number;
};

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
