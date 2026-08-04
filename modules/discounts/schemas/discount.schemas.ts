import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { z } from "zod";
import { DiscountType } from "@/app/generated/prisma/enums";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
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
	.regex(/^[A-Z0-9-]+$/, "Le code ne peut contenir que des lettres majuscules, chiffres et tirets");

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

const discountFiltersSchema = z.object({
	type: z.enum(DiscountType).optional(),
	isActive: z.boolean().optional(),
	hasUsages: z.boolean().optional(),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

const discountSortBySchema = z
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

// ============================================================================
// GET LIST SCHEMA
// ============================================================================

export const getDiscountsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_DISCOUNTS_DEFAULT_PER_PAGE, GET_DISCOUNTS_MAX_RESULTS_PER_PAGE),
	sortBy: discountSortBySchema,
	search: z.string().max(TEXT_LIMITS.SEARCH.max).optional(),
	filters: discountFiltersSchema.optional(),
});

// ============================================================================
// GET BY CODE SCHEMA (public checkout cache lookup)
// ============================================================================

export const getDiscountByCodeSchema = z.object({
	code: discountCodeSchema,
});

// ============================================================================
// VALIDATE CODE SCHEMA (public checkout)
// ============================================================================

export const validateDiscountCodeSchema = z.object({
	code: discountCodeSchema,
	subtotal: z.number().int().nonnegative(), // Montant du panier en centimes (hors frais de port)
	customerEmail: z.email().optional(), // Porte la limite maxUsagePerUser (parcours invité)
});

// ============================================================================
// BASE DISCOUNT SCHEMA (sans refinements, extensible)
// ============================================================================

const baseDiscountSchema = z.object({
	code: discountCodeSchema,
	type: z.enum(DiscountType),
	value: z
		.number()
		.int()
		.positive("La valeur doit être positive")
		.max(100_000_00, "La valeur ne peut pas dépasser 100 000€"),
	// `.positive()`, pas `.nonnegative()` : miroir du CHECK DB
	// `Discount_minOrderAmount_positive` (`raw-guards.sql`), motivé au schéma Prisma
	// par « 0 serait un code inutilisable créé par erreur ». Le schéma acceptait 0
	// alors que l'input admin l'invitait (`min={0}`) et que `"0"` est truthy côté
	// action — la saisie remontait donc en violation de contrainte Postgres, rendue
	// à l'admin en erreur générique. « Pas de minimum » s'exprime par `null`.
	minOrderAmount: z
		.number()
		.int()
		.positive("Le montant minimum doit être supérieur à 0 (laisser vide pour aucun minimum)")
		.optional()
		.nullable(),
	maxUsageCount: z.number().int().positive().optional().nullable(),
	maxUsagePerUser: z.number().int().positive().optional().nullable(),
	// Pas de `startsAt` : un code est utilisable dès sa création (activation
	// différée = manuelle depuis le retrait du cron de planification).
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
			{ message: "Un pourcentage ne peut pas dépasser 100%", path: ["value"] },
		)
		.refine(
			(data) => {
				if (
					data.maxUsagePerUser != null &&
					data.maxUsageCount != null &&
					data.maxUsagePerUser > data.maxUsageCount
				) {
					return false;
				}
				return true;
			},
			{
				message: "Le nombre max par utilisateur ne peut pas dépasser le nombre max total",
				path: ["maxUsagePerUser"],
			},
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
	}),
);

// ============================================================================
// DELETE SCHEMA
// ============================================================================

export const deleteDiscountSchema = z.object({
	id: z.cuid2("ID invalide"),
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

// Les schémas restore/extend-validity/reset-counter sont partis au Lot 4 avec
// leurs 3 Server Actions : aucune n'avait de déclencheur UI (SIMPLIFICATION.md
// S3.9d). Prolonger une validité ou corriger un compteur passe par l'édition
// complète du code promo (`update-discount`).
