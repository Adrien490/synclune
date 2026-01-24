import { z } from "zod";
import { DiscountType } from "@/app/generated/prisma/client";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_DISCOUNTS_DEFAULT_PER_PAGE,
	GET_DISCOUNTS_MAX_RESULTS_PER_PAGE,
	DISCOUNTS_SORT_OPTIONS,
} from "../constants/discount.constants";

// ============================================================================
// CODE VALIDATION
// ============================================================================

export const discountCodeSchema = z
	.string()
	.trim()
	.min(3, "Le code doit contenir au moins 3 caractères")
	.max(30, "Le code ne peut pas dépasser 30 caractères")
	.toUpperCase()
	.regex(
		/^[A-Z0-9-]+$/,
		"Le code ne peut contenir que des lettres majuscules, chiffres et tirets"
	);

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const discountFiltersSchema = z.object({
	type: z.enum(DiscountType).optional(),
	isActive: z.boolean().optional(),
	hasUsages: z.boolean().optional(),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const discountSortBySchema = z
	.enum([
		DISCOUNTS_SORT_OPTIONS.CREATED_DESC,
		DISCOUNTS_SORT_OPTIONS.CREATED_ASC,
		DISCOUNTS_SORT_OPTIONS.CODE_ASC,
		DISCOUNTS_SORT_OPTIONS.CODE_DESC,
		DISCOUNTS_SORT_OPTIONS.USAGE_DESC,
		DISCOUNTS_SORT_OPTIONS.USAGE_ASC,
	])
	.default(DISCOUNTS_SORT_OPTIONS.CREATED_DESC);

// ============================================================================
// GET SINGLE SCHEMA
// ============================================================================

export const getDiscountSchema = z.object({
	id: z.cuid2(),
});

export const getDiscountByCodeSchema = z.object({
	code: discountCodeSchema,
});

// ============================================================================
// GET LIST SCHEMA
// ============================================================================

export const getDiscountsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_DISCOUNTS_DEFAULT_PER_PAGE, GET_DISCOUNTS_MAX_RESULTS_PER_PAGE),
	sortBy: discountSortBySchema,
	search: z.string().max(100).optional(),
	filters: discountFiltersSchema.optional(),
});

// ============================================================================
// VALIDATE CODE SCHEMA (public checkout)
// ============================================================================

export const validateDiscountCodeSchema = z.object({
	code: discountCodeSchema,
	subtotal: z.number().int().nonnegative(), // Montant du panier en centimes (hors frais de port)
	userId: z.cuid2().optional(),
	customerEmail: z.email().optional(), // Pour guest checkout
});

// ============================================================================
// BASE DISCOUNT SCHEMA (sans refinements, extensible)
// ============================================================================

const baseDiscountSchema = z.object({
	code: discountCodeSchema,
	type: z.enum(DiscountType),
	value: z.number().int().positive("La valeur doit être positive"),
	minOrderAmount: z.number().int().nonnegative().optional().nullable(),
	maxUsageCount: z.number().int().positive().optional().nullable(),
	maxUsagePerUser: z.number().int().positive().optional().nullable(),
	startsAt: z.coerce.date().optional().nullable(),
	endsAt: z.coerce.date().optional().nullable(),
});

// Refinements communs
const discountRefinements = <T extends typeof baseDiscountSchema>(schema: T) =>
	schema
		.refine(
			(data) => {
				if (data.type === DiscountType.PERCENTAGE && data.value > 100) {
					return false;
				}
				return true;
			},
			{ message: "Un pourcentage ne peut pas dépasser 100%", path: ["value"] }
		)
		.refine(
			(data) => {
				if (data.startsAt && data.endsAt && data.startsAt >= data.endsAt) {
					return false;
				}
				return true;
			},
			{ message: "La date de fin doit être postérieure à la date de début", path: ["endsAt"] }
		);

// ============================================================================
// CREATE SCHEMA
// ============================================================================

export const createDiscountSchema = discountRefinements(baseDiscountSchema);

// ============================================================================
// UPDATE SCHEMA
// ============================================================================

export const updateDiscountSchema = discountRefinements(
	baseDiscountSchema.extend({
		id: z.cuid2("ID invalide"),
	})
);

// ============================================================================
// DELETE SCHEMA
// ============================================================================

export const deleteDiscountSchema = z.object({
	id: z.cuid2("ID invalide"),
});

// ============================================================================
// BULK DELETE SCHEMA
// ============================================================================

export const bulkDeleteDiscountsSchema = z.object({
	ids: z
		.array(z.cuid2())
		.min(1, "Au moins un code doit être sélectionné"),
});

// ============================================================================
// TOGGLE STATUS SCHEMA
// ============================================================================

export const toggleDiscountStatusSchema = z.object({
	id: z.cuid2("ID invalide"),
});

// ============================================================================
// BULK TOGGLE STATUS SCHEMA
// ============================================================================

/**
 * Schema pour activer/désactiver plusieurs codes promo en masse
 */
export const bulkToggleDiscountStatusSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins un code doit être sélectionné"),
	isActive: z.boolean(),
});
