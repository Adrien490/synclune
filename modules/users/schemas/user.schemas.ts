import { z } from "zod";
import { Role } from "@/app/generated/prisma/client";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";
import {
	GET_USERS_DEFAULT_PER_PAGE,
	GET_USERS_DEFAULT_SORT_BY,
	GET_USERS_DEFAULT_SORT_ORDER,
	GET_USERS_MAX_RESULTS_PER_PAGE,
	GET_USERS_SORT_FIELDS,
} from "../constants/user.constants";
import { DATE_LIMITS, TEXT_LIMITS } from "@/shared/constants/validation-limits";

const roleSchema = z
	.union([z.enum([Role.USER, Role.ADMIN]), z.array(z.enum([Role.USER, Role.ADMIN]))])
	.optional();

// ============================================================================
// GET USER SCHEMA
// ============================================================================

export const getUserSchema = z.object({
	userId: z.string().optional(),
});

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const userFiltersSchema = z
	.object({
		name: optionalStringOrStringArraySchema,
		email: optionalStringOrStringArraySchema,
		role: roleSchema,
		emailVerified: z.boolean().optional(),
		hasStripeCustomer: z.boolean().optional(),
		hasImage: z.boolean().optional(),
		createdAfter: z.coerce
			.date()
			.min(DATE_LIMITS.FILTERS_MIN, "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		createdBefore: z.coerce
			.date()
			.min(DATE_LIMITS.FILTERS_MIN, "Date too old")
			.optional(),
		updatedAfter: z.coerce
			.date()
			.min(DATE_LIMITS.FILTERS_MIN, "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		updatedBefore: z.coerce
			.date()
			.min(DATE_LIMITS.FILTERS_MIN, "Date too old")
			.optional(),
		hasOrders: z.boolean().optional(),
		hasSessions: z.boolean().optional(),
		minOrderCount: z.number().int().nonnegative().max(10000).optional(),
		includeDeleted: z.boolean().optional(),
	})
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	}, "createdAfter must be before or equal to createdBefore")
	.refine((data) => {
		if (data.updatedAfter && data.updatedBefore) {
			return data.updatedAfter <= data.updatedBefore;
		}
		return true;
	}, "updatedAfter must be before or equal to updatedBefore");

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const userSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_USERS_SORT_FIELDS.includes(
			value as (typeof GET_USERS_SORT_FIELDS)[number]
		)
		? value
		: GET_USERS_DEFAULT_SORT_BY;
}, z.enum(GET_USERS_SORT_FIELDS));

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getUsersSchema = z.object({
	search: z
		.string()
		.trim()
		.max(TEXT_LIMITS.USER_SEARCH.max, { message: "Search term too long" })
		.optional(),
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_USERS_DEFAULT_PER_PAGE, GET_USERS_MAX_RESULTS_PER_PAGE),
	sortBy: userSortBySchema.default(GET_USERS_DEFAULT_SORT_BY),
	sortOrder: z.enum(["asc", "desc"]).default(GET_USERS_DEFAULT_SORT_ORDER),
	filters: userFiltersSchema.default({}),
});

// ============================================================================
// UPDATE PROFILE SCHEMA
// ============================================================================

import { USER_CONSTANTS, USER_ERROR_MESSAGES } from "@/modules/users/constants/profile.constants";

/**
 * Schéma de validation pour la mise à jour du profil utilisateur
 * Note: l'email n'est plus modifiable, seul le prénom peut être mis à jour
 */
export const updateProfileSchema = z.object({
	name: z
		.string()
		.min(
			USER_CONSTANTS.MIN_NAME_LENGTH,
			USER_ERROR_MESSAGES.NAME_TOO_SHORT
		)
		.max(
			USER_CONSTANTS.MAX_NAME_LENGTH,
			USER_ERROR_MESSAGES.NAME_TOO_LONG
		)
		.trim(),
});

// ============================================================================
// DELETE ACCOUNT SCHEMA (RGPD)
// ============================================================================

/**
 * Schéma de validation pour la suppression de compte
 * Requiert une confirmation explicite de l'utilisateur
 */
export const deleteAccountSchema = z.object({
	confirmation: z
		.string()
		.refine(
			(val) => val === USER_CONSTANTS.ACCOUNT_DELETION_CONFIRMATION,
			`Veuillez saisir ${USER_CONSTANTS.ACCOUNT_DELETION_CONFIRMATION} pour confirmer`
		),
});

// ============================================================================
// EXPORT USER DATA SCHEMA (RGPD)
// ============================================================================

/**
 * Schéma pour l'export des données utilisateur
 * Pas de validation nécessaire côté input, juste un type pour la réponse
 */
export const exportUserDataResponseSchema = z.object({
	exportedAt: z.string().datetime(),
	profile: z.object({
		name: z.string().nullable(),
		email: z.email(),
		createdAt: z.string().datetime(),
	}),
	addresses: z.array(
		z.object({
			firstName: z.string(),
			lastName: z.string(),
			address1: z.string(),
			address2: z.string().nullable(),
			postalCode: z.string(),
			city: z.string(),
			country: z.string(),
			phone: z.string(),
			isDefault: z.boolean(),
		})
	),
	orders: z.array(
		z.object({
			orderNumber: z.string(),
			date: z.string().datetime(),
			status: z.string(),
			paymentStatus: z.string(),
			total: z.number(),
			currency: z.string(),
			items: z.array(
				z.object({
					productTitle: z.string(),
					skuColor: z.string().nullable(),
					skuMaterial: z.string().nullable(),
					skuSize: z.string().nullable(),
					price: z.number(),
					quantity: z.number().int().positive(),
				})
			),
			shippingAddress: z.object({
				firstName: z.string(),
				lastName: z.string(),
				address1: z.string(),
				city: z.string(),
				postalCode: z.string(),
				country: z.string(),
			}),
		})
	),
	wishlist: z.array(
		z.object({
			productTitle: z.string(),
			addedAt: z.string().datetime(),
		})
	),
	discountUsages: z.array(
		z.object({
			code: z.string(),
			amountApplied: z.number(),
			usedAt: z.string().datetime(),
		})
	),
});
