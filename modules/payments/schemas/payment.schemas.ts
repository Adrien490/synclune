import { z } from "zod";
import { PaymentStatus } from "@/app/generated/prisma/client";
import {
	GET_STRIPE_PAYMENTS_DEFAULT_PER_PAGE,
	GET_STRIPE_PAYMENTS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
} from "../constants/payment.constants";

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const stripePaymentFiltersSchema = z.object({
	paymentStatus: z.enum(PaymentStatus).optional(),
	dateFrom: z.coerce.date().optional(),
	dateTo: z.coerce.date().optional(),
	hasStripePaymentIntent: z.boolean().optional(),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

const VALID_SORT_OPTIONS = [
	SORT_OPTIONS.PAID_AT_DESC,
	SORT_OPTIONS.PAID_AT_ASC,
	SORT_OPTIONS.TOTAL_DESC,
	SORT_OPTIONS.TOTAL_ASC,
	SORT_OPTIONS.PAYMENT_STATUS_ASC,
	SORT_OPTIONS.PAYMENT_STATUS_DESC,
] as const;

export const stripePaymentSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		VALID_SORT_OPTIONS.includes(value as (typeof VALID_SORT_OPTIONS)[number])
		? value
		: SORT_OPTIONS.PAID_AT_DESC;
}, z.enum(VALID_SORT_OPTIONS));

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getStripePaymentsSchema = z.object({
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int({ message: "PerPage must be an integer" })
		.min(1, { message: "PerPage must be at least 1" })
		.max(
			GET_STRIPE_PAYMENTS_MAX_RESULTS_PER_PAGE,
			`PerPage cannot exceed ${GET_STRIPE_PAYMENTS_MAX_RESULTS_PER_PAGE}`
		)
		.default(GET_STRIPE_PAYMENTS_DEFAULT_PER_PAGE),
	sortBy: stripePaymentSortBySchema,
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	search: z.string().max(255).optional(),
	filters: stripePaymentFiltersSchema.optional(),
});

// ============================================================================
// CHECKOUT SCHEMA
// ============================================================================

// Regex pour téléphone français
// Formats acceptés: 06 12 34 56 78, 0612345678, +33 6 12 34 56 78, +33612345678
const FRENCH_PHONE_REGEX = /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;

import {
	SHIPPING_COUNTRIES,
	COUNTRY_ERROR_MESSAGE,
} from "@/shared/constants/countries";

/**
 * Schéma de validation pour le formulaire de checkout
 * Gère à la fois les utilisateurs connectés et les guests
 * Livraison France + UE uniquement (pas de douanes)
 */
export const checkoutSchema = z
	.object({
		// Email requis pour les guests, pré-rempli pour les utilisateurs connectés
		email: z
			.string()
			.max(100, { message: "L'email ne peut pas dépasser 100 caractères" })
			.trim()
			.toLowerCase()
			.optional(),

		// Adresse de livraison (obligatoire)
		shipping: z.object({
			firstName: z
				.string({ message: "Le prénom est requis" })
				.min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
				.max(100, { message: "Le prénom est trop long" })
				.trim(),

			lastName: z
				.string({ message: "Le nom est requis" })
				.min(2, { message: "Le nom doit contenir au moins 2 caractères" })
				.max(100, { message: "Le nom est trop long" })
				.trim(),

			addressLine1: z
				.string({ message: "L'adresse est requise" })
				.min(5, {
					message: "L'adresse doit contenir au moins 5 caractères",
				})
				.max(200, { message: "L'adresse est trop longue" })
				.trim(),

			addressLine2: z
				.string()
				.max(200, {
					message: "L'adresse complémentaire est trop longue",
				})
				.optional()
				.or(z.literal("")),

			city: z
				.string({ message: "La ville est requise" })
				.min(2, {
					message: "Le nom de ville doit contenir au moins 2 caractères",
				})
				.max(100, { message: "Le nom de ville est trop long" })
				.trim(),

			postalCode: z
				.string({ message: "Le code postal est requis" })
				.min(1, { message: "Le code postal est requis" })
				.max(20, { message: "Code postal invalide" }),

			country: z.enum(SHIPPING_COUNTRIES, {
				message: COUNTRY_ERROR_MESSAGE,
			}),

			phoneNumber: z
				.string({ message: "Le numéro de téléphone est requis" })
				.regex(FRENCH_PHONE_REGEX, {
					message:
						"Numéro de téléphone invalide (format: 06 12 34 56 78 ou +33 6 12 34 56 78)",
				}),
		}),

		// Consentements
		termsAccepted: z.boolean().refine((val) => val === true, {
			message:
				"Tu dois accepter les conditions générales de vente pour continuer",
		}),

		newsletter: z.boolean().default(false),

		// Enregistrer l'adresse (utilisateurs connectés uniquement)
		saveAddress: z.boolean().default(false),
	});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

// ============================================================================
// BULK ADMIN SCHEMAS
// ============================================================================

/**
 * Schema pour exporter plusieurs paiements en CSV
 */
export const bulkExportPaymentsSchema = z.object({
	ids: z.array(z.cuid()).min(1, "Au moins un paiement doit être sélectionné"),
});

export type BulkExportPaymentsInput = z.infer<typeof bulkExportPaymentsSchema>;
