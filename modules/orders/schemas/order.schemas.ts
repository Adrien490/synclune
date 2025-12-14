import { z } from "zod";
import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_ORDERS_DEFAULT_PER_PAGE,
	GET_ORDERS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
} from "../constants/order.constants";

// ============================================================================
// HELPERS
// ============================================================================

const orderStatusSchema = z
	.union([z.enum(OrderStatus), z.array(z.enum(OrderStatus))])
	.optional();

const paymentStatusSchema = z
	.union([z.enum(PaymentStatus), z.array(z.enum(PaymentStatus))])
	.optional();

const fulfillmentStatusSchema = z
	.union([
		z.enum(FulfillmentStatus),
		z.array(z.enum(FulfillmentStatus)),
	])
	.optional();

// ============================================================================
// GET ORDER SCHEMA
// ============================================================================

export const getOrderSchema = z.object({
	orderNumber: z.string().trim().min(1),
});

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const orderFiltersSchema = z
	.object({
		status: orderStatusSchema,
		paymentStatus: paymentStatusSchema,
		fulfillmentStatus: fulfillmentStatusSchema,
		totalMin: z.coerce.number().int().nonnegative().max(10000000).optional(),
		totalMax: z.coerce.number().int().nonnegative().max(10000000).optional(),
		createdAfter: z
			.union([z.string(), z.date()])
			.transform((val) => {
				if (val instanceof Date) return val;
				if (typeof val === "string") {
					const date = new Date(val);
					return isNaN(date.getTime()) ? undefined : date;
				}
				return undefined;
			})
			.optional(),
		createdBefore: z
			.union([z.string(), z.date()])
			.transform((val) => {
				if (val instanceof Date) return val;
				if (typeof val === "string") {
					const date = new Date(val);
					return isNaN(date.getTime()) ? undefined : date;
				}
				return undefined;
			})
			.optional(),
		showDeleted: z
			.union([z.boolean(), z.enum(["true", "false"])])
			.optional()
			.transform((val) => {
				if (typeof val === "boolean") return val;
				if (val === "true") return true;
				if (val === "false") return false;
				return undefined;
			}),
	})
	.refine((data) => {
		if (data.totalMin && data.totalMax) {
			return data.totalMin <= data.totalMax;
		}
		return true;
	}, "totalMin must be less than or equal to totalMax")
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	}, "createdAfter must be before or equal to createdBefore");

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const orderSortBySchema = z
	.enum([
		SORT_OPTIONS.CREATED_DESC,
		SORT_OPTIONS.CREATED_ASC,
		SORT_OPTIONS.TOTAL_DESC,
		SORT_OPTIONS.TOTAL_ASC,
		SORT_OPTIONS.STATUS_ASC,
		SORT_OPTIONS.STATUS_DESC,
		SORT_OPTIONS.PAYMENT_STATUS_ASC,
		SORT_OPTIONS.PAYMENT_STATUS_DESC,
		SORT_OPTIONS.FULFILLMENT_STATUS_ASC,
		SORT_OPTIONS.FULFILLMENT_STATUS_DESC,
	])
	.default(SORT_OPTIONS.CREATED_DESC);

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getOrdersSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_ORDERS_DEFAULT_PER_PAGE, GET_ORDERS_MAX_RESULTS_PER_PAGE),
	sortBy: orderSortBySchema,
	search: z.string().max(255).optional(),
	filters: orderFiltersSchema.optional(),
});

// ============================================================================
// EXPORT INVOICES SCHEMA
// ============================================================================

/**
 * Schema de validation pour l'export du livre de recettes
 *
 * Conformite Article 286 du CGI (Code General des Impots)
 * Les commercants doivent tenir un livre de recettes avec toutes les ventes
 */
export const exportInvoicesSchema = z.object({
	/**
	 * Type de periode pour le filtrage
	 * - "all" : Toutes les factures (defaut)
	 * - "year" : Factures d'une annee specifique
	 * - "month" : Factures d'un mois specifique
	 * - "custom" : Periode personnalisee avec dateFrom et dateTo
	 */
	periodType: z
		.enum(["all", "year", "month", "custom"])
		.optional()
		.default("all"),

	/**
	 * Annee (format YYYY)
	 * Requis si periodType = "year" ou "month"
	 */
	year: z.coerce
		.number()
		.int()
		.min(2020)
		.max(2100)
		.optional(),

	/**
	 * Mois (1-12)
	 * Requis si periodType = "month"
	 */
	month: z.coerce
		.number()
		.int()
		.min(1)
		.max(12)
		.optional(),

	/**
	 * Date de debut pour periode custom (ISO 8601)
	 */
	dateFrom: z.coerce.date().optional(),

	/**
	 * Date de fin pour periode custom (ISO 8601)
	 */
	dateTo: z.coerce.date().optional(),

	/**
	 * Format d'export
	 * - "csv" : Format CSV compatible Excel (defaut)
	 */
	format: z.enum(["csv"]).optional().default("csv"),

	/**
	 * Filtrer par statut de facture
	 * - "all" : Toutes les factures (defaut)
	 * - "sent" : Seulement les factures envoyees
	 * - "archived" : Seulement les factures archivees
	 */
	invoiceStatus: z
		.enum(["all", "sent", "archived"])
		.optional()
		.default("all"),
}).refine(
	(data) => {
		// Si periodType = "year", year est requis
		if (data.periodType === "year" && !data.year) {
			return false;
		}
		// Si periodType = "month", year et month sont requis
		if (data.periodType === "month" && (!data.year || !data.month)) {
			return false;
		}
		// Si periodType = "custom", dateFrom et dateTo sont requis
		if (data.periodType === "custom" && (!data.dateFrom || !data.dateTo)) {
			return false;
		}
		return true;
	},
	{
		message: "Les paramètres de période sont invalides",
	}
);

export type ExportInvoicesInput = z.infer<typeof exportInvoicesSchema>;

// ============================================================================
// DELETE ORDER SCHEMA
// ============================================================================

/**
 * Schema pour la suppression d'une commande
 * Une commande peut être supprimée UNIQUEMENT si :
 * - Aucune facture n'a été émise (invoiceNumber === null)
 * - Elle n'a pas été payée (paymentStatus !== PAID)
 */
export const deleteOrderSchema = z.object({
	id: z.cuid2(),
});

// ============================================================================
// BULK DELETE ORDERS SCHEMA
// ============================================================================

/**
 * Schema pour la suppression en masse de commandes
 * Seules les commandes éligibles seront supprimées
 */
export const bulkDeleteOrdersSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins une commande doit être sélectionnée"),
});

// ============================================================================
// CANCEL ORDER SCHEMA
// ============================================================================

/**
 * Schema pour l'annulation d'une commande
 * L'annulation passe le statut à CANCELLED et paymentStatus à REFUNDED si nécessaire
 * Préserve l'intégrité comptable (la commande reste en base)
 */
export const cancelOrderSchema = z.object({
	id: z.cuid2(),
	reason: z.string().max(500).optional(),
});

// ============================================================================
// MARK AS PAID SCHEMA
// ============================================================================

/**
 * Schema pour marquer une commande comme payée manuellement
 * Utile pour les paiements par virement ou chèque
 */
export const markAsPaidSchema = z.object({
	id: z.cuid2(),
	note: z.string().max(500).optional(),
});

// ============================================================================
// MARK AS SHIPPED SCHEMA
// ============================================================================

/**
 * Schema pour marquer une commande comme expédiée
 * Requiert un numéro de suivi
 */
export const markAsShippedSchema = z.object({
	id: z.cuid2(),
	trackingNumber: z.string().min(1, "Le numéro de suivi est requis").max(100),
	trackingUrl: z.string().url().optional().or(z.literal("")),
	carrier: z.string().max(100).optional(),
	sendEmail: z
		.union([z.boolean(), z.enum(["true", "false"])])
		.optional()
		.default(true)
		.transform((val) => {
			if (typeof val === "boolean") return val;
			return val === "true";
		}),
});

// ============================================================================
// UPDATE TRACKING SCHEMA
// ============================================================================

/**
 * Schema pour mettre à jour les informations de suivi d'une commande déjà expédiée
 * Permet de modifier le numéro de suivi, l'URL, le transporteur et la date de livraison estimée
 */
export const updateTrackingSchema = z.object({
	id: z.cuid2(),
	trackingNumber: z.string().min(1, "Le numéro de suivi est requis").max(100),
	trackingUrl: z.string().url().optional().or(z.literal("")),
	carrier: z.string().max(100).optional(),
	estimatedDelivery: z.coerce.date().optional(),
	sendEmail: z
		.union([z.boolean(), z.enum(["true", "false"])])
		.optional()
		.default(true)
		.transform((val) => {
			if (typeof val === "boolean") return val;
			return val === "true";
		}),
});

// ============================================================================
// MARK AS DELIVERED SCHEMA
// ============================================================================

/**
 * Schema pour marquer une commande comme livrée
 * Utilisé pour forcer le statut si le webhook transporteur ne fonctionne pas
 */
export const markAsDeliveredSchema = z.object({
	id: z.cuid2(),
	sendEmail: z
		.union([z.boolean(), z.enum(["true", "false"])])
		.optional()
		.default(true)
		.transform((val) => {
			if (typeof val === "boolean") return val;
			return val === "true";
		}),
});

// ============================================================================
// MARK AS PROCESSING SCHEMA
// ============================================================================

/**
 * Schema pour passer une commande payée en préparation
 * Transition : PENDING (PAID) → PROCESSING
 */
export const markAsProcessingSchema = z.object({
	id: z.cuid2(),
	sendEmail: z
		.union([z.boolean(), z.enum(["true", "false"])])
		.optional()
		.default(false)
		.transform((val) => {
			if (typeof val === "boolean") return val;
			return val === "true";
		}),
});

// ============================================================================
// REVERT TO PROCESSING SCHEMA
// ============================================================================

/**
 * Schema pour annuler une expédition et revenir en préparation
 * Transition : SHIPPED → PROCESSING
 * Requiert une raison obligatoire pour l'audit trail
 */
export const revertToProcessingSchema = z.object({
	id: z.cuid2(),
	reason: z
		.string()
		.min(1, "La raison est obligatoire")
		.max(500, "La raison ne peut pas dépasser 500 caractères"),
});

// ============================================================================
// MARK AS RETURNED SCHEMA
// ============================================================================

/**
 * Schema pour marquer une commande comme retournée
 * Transition FulfillmentStatus : DELIVERED → RETURNED
 * Le OrderStatus reste DELIVERED
 */
export const markAsReturnedSchema = z.object({
	id: z.cuid2(),
	reason: z.string().max(500).optional(),
});

// ============================================================================
// BULK MARK AS DELIVERED SCHEMA
// ============================================================================

/**
 * Schema pour marquer plusieurs commandes comme livrées
 * Filtrage automatique : seules les commandes SHIPPED seront traitées
 */
export const bulkMarkAsDeliveredSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins une commande doit être sélectionnée"),
	sendEmail: z
		.union([z.boolean(), z.enum(["true", "false"])])
		.optional()
		.default(false)
		.transform((val) => {
			if (typeof val === "boolean") return val;
			return val === "true";
		}),
});

// ============================================================================
// BULK CANCEL ORDERS SCHEMA
// ============================================================================

/**
 * Schema pour annuler plusieurs commandes en masse
 * Filtrage automatique : seules les commandes non annulées seront traitées
 */
export const bulkCancelOrdersSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins une commande doit être sélectionnée"),
	reason: z.string().max(500).optional(),
});
