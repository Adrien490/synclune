import { z } from "zod";
import { Role } from "@/app/generated/prisma/client";
import {
	GET_USERS_DEFAULT_PER_PAGE,
	GET_USERS_DEFAULT_SORT_BY,
	GET_USERS_DEFAULT_SORT_ORDER,
	GET_USERS_MAX_RESULTS_PER_PAGE,
	GET_USERS_SORT_FIELDS,
} from "../constants/user.constants";

// ============================================================================
// HELPERS
// ============================================================================

const stringOrStringArray = z
	.union([
		z.string().min(1).max(100),
		z.array(z.string().min(1).max(100)).max(50),
	])
	.optional();

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
		name: stringOrStringArray,
		email: stringOrStringArray,
		role: roleSchema,
		emailVerified: z.boolean().optional(),
		hasStripeCustomer: z.boolean().optional(),
		hasImage: z.boolean().optional(),
		createdAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		createdBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		updatedAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		updatedBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		hasOrders: z.boolean().optional(),
		hasSessions: z.boolean().optional(),
		minOrderCount: z.number().int().nonnegative().max(10000).optional(),
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
		.max(255, { message: "Search term too long" })
		.optional(),
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int({ message: "PerPage must be an integer" })
		.min(1, { message: "PerPage must be at least 1" })
		.max(
			GET_USERS_MAX_RESULTS_PER_PAGE,
			`PerPage cannot exceed ${GET_USERS_MAX_RESULTS_PER_PAGE}`
		)
		.default(GET_USERS_DEFAULT_PER_PAGE),
	sortBy: userSortBySchema.default(GET_USERS_DEFAULT_SORT_BY),
	sortOrder: z.enum(["asc", "desc"]).default(GET_USERS_DEFAULT_SORT_ORDER),
	filters: userFiltersSchema.default({}),
});

// ============================================================================
// UPDATE PROFILE SCHEMA
// ============================================================================

import { USER_CONSTANTS, USER_ERROR_MESSAGES } from "@/shared/constants/user";

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
			(val) => val === "SUPPRIMER",
			"Veuillez saisir SUPPRIMER pour confirmer"
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
		email: z.string().email(),
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
			skuColor: z.string().nullable(),
			price: z.number(),
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
