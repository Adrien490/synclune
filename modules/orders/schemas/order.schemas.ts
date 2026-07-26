import { z } from "zod";
import { formBooleanSchema } from "@/shared/schemas/boolean.schema";
import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	InvoiceStatus,
} from "@/app/generated/prisma/client";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address.constants";
import { SHIPPING_COUNTRIES, COUNTRY_ERROR_MESSAGE } from "@/shared/constants/countries";
import { emailSchema } from "@/shared/schemas/email.schemas";
import { phoneSchema } from "@/shared/schemas/phone.schemas";
import { stringOrDateSchema } from "@/shared/schemas/date.schemas";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_ORDERS_DEFAULT_PER_PAGE,
	GET_ORDERS_MAX_RESULTS_PER_PAGE,
	ORDER_TOTAL_FILTER_MAX_CENTS,
	SORT_OPTIONS,
} from "../constants/order.constants";

// ============================================================================
// HELPERS
// ============================================================================

const orderStatusSchema = z.union([z.enum(OrderStatus), z.array(z.enum(OrderStatus))]).optional();

const paymentStatusSchema = z
	.union([z.enum(PaymentStatus), z.array(z.enum(PaymentStatus))])
	.optional();

const fulfillmentStatusSchema = z
	.union([z.enum(FulfillmentStatus), z.array(z.enum(FulfillmentStatus))])
	.optional();

const invoiceStatusSchema = z
	.union([z.enum(InvoiceStatus), z.array(z.enum(InvoiceStatus))])
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
		invoiceStatus: invoiceStatusSchema,
		/**
		 * Preset "anomalie de facturation" (EINV-UI-005 audit 2026-05-28).
		 * Filtre les commandes `paymentStatus=PAID AND invoiceNumber IS NULL` —
		 * cas critique Art. 286 CGI : commande encaissée sans facture émise.
		 */
		invoiceAnomaly: formBooleanSchema.optional(),
		/**
		 * Preset "PDF non archivé" (EINV-UI-106) : facture GENERATED dont le PDF
		 * immuable est absent (invoicePdfUrl IS NULL) — maintenance Art. L102 B LPF.
		 */
		pdfNotArchived: formBooleanSchema.optional(),
		/**
		 * Preset "retry escaladé" (EINV-UI-106) : DLQ facturation
		 * (invoiceRetryDeferred = true) — archivage PDF / avoir en échec escaladé.
		 */
		retryDeferred: formBooleanSchema.optional(),
		// En centimes (cf. ORDER_TOTAL_FILTER_MAX_CENTS pour la frontière d'unité)
		totalMin: z.coerce.number().int().nonnegative().max(ORDER_TOTAL_FILTER_MAX_CENTS).optional(),
		totalMax: z.coerce.number().int().nonnegative().max(ORDER_TOTAL_FILTER_MAX_CENTS).optional(),
		createdAfter: stringOrDateSchema,
		createdBefore: stringOrDateSchema,
		showDeleted: z.enum(["all", "active", "deleted"]).optional().default("active"),
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

const orderSortBySchema = z
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
export const exportInvoicesSchema = z
	.object({
		/**
		 * Type de periode pour le filtrage
		 * - "all" : Toutes les factures (defaut)
		 * - "year" : Factures d'une annee specifique
		 * - "month" : Factures d'un mois specifique
		 * - "custom" : Periode personnalisee avec dateFrom et dateTo
		 */
		periodType: z.enum(["all", "year", "month", "custom"]).optional().default("all"),

		/**
		 * Annee (format YYYY)
		 * Requis si periodType = "year" ou "month"
		 */
		year: z.coerce.number().int().min(2020).max(2100).optional(),

		/**
		 * Mois (1-12)
		 * Requis si periodType = "month"
		 */
		month: z.coerce.number().int().min(1).max(12).optional(),

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
		invoiceStatus: z.enum(["all", "sent", "archived"]).optional().default("all"),
	})
	.refine(
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
		},
	)
	.refine(
		(data) => {
			// ORD-SEC-003: dateFrom doit precéder dateTo (anti DB-load inutile + UX)
			if (data.periodType === "custom" && data.dateFrom && data.dateTo) {
				return data.dateFrom <= data.dateTo;
			}
			return true;
		},
		{
			message: "dateFrom doit être antérieure ou égale à dateTo",
			path: ["dateFrom"],
		},
	)
	.refine(
		(data) => {
			// ORD-SEC-010: cap range custom à 366 jours (defense en profondeur DB load —
			// complete le cap take: 50_000 de getOrdersForExport). Pour exports
			// pluri-annuels, utiliser periodType "year" itéré côté UI.
			if (data.periodType === "custom" && data.dateFrom && data.dateTo) {
				const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
				return data.dateTo.getTime() - data.dateFrom.getTime() <= MAX_RANGE_MS;
			}
			return true;
		},
		{
			message: "La période custom ne peut pas excéder 366 jours",
			path: ["dateTo"],
		},
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
 *
 * ORD-BIZ-003 : `reason` requis (3..500 chars) tracé dans `OrderHistory`
 * pour audit trail Art. L123-22.
 */
export const deleteOrderSchema = z.object({
	id: z.cuid2(),
	reason: z
		.string()
		.min(3, "La raison de suppression est obligatoire (min 3 caractères)")
		.max(500, "La raison ne doit pas dépasser 500 caractères"),
});

// ============================================================================
// BULK DELETE ORDERS SCHEMA
// ============================================================================

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
	autoRefund: z.boolean().optional().default(false),
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
	// EINV-CASH-002 (audit montant 2026-07-02) : attestation explicite admin
	// requise quand le PaymentIntent Stripe n'est PAS settled (paiement reçu
	// hors Stripe — virement/chèque). Consignée dans l'audit trail OrderHistory.
	confirmOffStripePayment: z.boolean().optional().default(false),
});

// ============================================================================
// TRACKING URL SCHEMA (ORD-SEC-008 — anti javascript:/data:/vbscript: XSS)
// ============================================================================

/**
 * URL de suivi colis : http(s) uniquement.
 *
 * Le trackingUrl est rendu via `<a href={trackingUrl}>` dans 2 emails
 * transactionnels (order-confirmation, shipping-confirmation)
 * et dans le panneau admin update-tracking-form. Sans cette restriction,
 * `z.url()` accepte `javascript:alert(1)` → XSS au clic depuis l'admin et
 * potentiellement depuis certains rendus email (preview inline JS).
 */
const trackingUrlSchema = z.preprocess(
	// Un champ vide (`<input type="hidden">` non renseigné) arrive en `""` via
	// `safeFormGet`, jamais en `undefined`. Sans cette normalisation, le
	// `validated.data.trackingUrl ?? getTrackingUrl(...)` des actions ne se
	// déclenchait jamais (`??` ne couvre que `null | undefined`) : l'URL générée
	// serveur était inatteignable depuis l'UI, et `""` était persisté là où les
	// consommateurs — et `revertToProcessing` — attendent `null`.
	(value) => (value === "" ? undefined : value),
	z
		.url()
		.refine((url) => /^https?:\/\//i.test(url), {
			message: "L'URL de suivi doit commencer par http:// ou https://",
		})
		.optional(),
);

// ============================================================================
// CARRIER ENUM
// ============================================================================

/**
 * Enum Zod pour les transporteurs
 * Doit correspondre au type Carrier dans types/carrier.types.ts
 */
export const carrierEnum = z.enum([
	"colissimo",
	"lettre_suivie",
	"mondial_relay",
	"chronopost",
	"dpd",
	"gls",
	"dhl",
	"ups",
	"fedex",
	"relais_colis",
	"autre",
]);

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
	trackingUrl: trackingUrlSchema,
	carrier: carrierEnum.optional(),
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
 * Permet de modifier le numéro de suivi, l'URL et le transporteur
 */
export const updateTrackingSchema = z.object({
	id: z.cuid2(),
	trackingNumber: z.string().min(1, "Le numéro de suivi est requis").max(100),
	trackingUrl: trackingUrlSchema,
	carrier: carrierEnum.optional(),
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
// ORDER NOTES SCHEMA
// ============================================================================

/**
 * Schema pour l'ajout d'une note interne à une commande
 * Réservé aux administrateurs
 */
export const addOrderNoteSchema = z.object({
	orderId: z.cuid2({ message: "ID commande invalide" }),
	content: z
		.string()
		.min(1, "La note ne peut pas être vide")
		.max(5000, "Note trop longue (max 5000 caractères)"),
	// true = note interne admin (fraude suspectée, blacklist, escalade légale).
	// Filtrée par getOrderNotesForUser pour empêcher tout leak côté client.
	isInternal: z.boolean().optional().default(false),
});

/**
 * Schema pour la suppression d'une note de commande
 * Réservé aux administrateurs
 */
export const deleteOrderNoteSchema = z.object({
	noteId: z.cuid2({ message: "ID note invalide" }),
});

/**
 * Schema pour l'édition d'une note de commande
 * Réservé à l'auteur de la note (vérifié dans l'action)
 */
export const updateOrderNoteSchema = z.object({
	noteId: z.cuid2({ message: "ID note invalide" }),
	content: z
		.string()
		.min(1, "La note ne peut pas être vide")
		.max(5000, "Note trop longue (max 5000 caractères)"),
});

/**
 * Schema pour transition explicite paymentStatus -> REFUNDED admin
 * Sans annulation de la commande (geste commercial, remboursement hors-bord Stripe).
 *
 * ORD-BIZ-008 : `manualRefundMethod` requis pour tracer dans `OrderHistory`
 * le moyen exact du remboursement hors Stripe (audit comptable Art. L123-22).
 */
export const manualRefundMethodEnum = z.enum(["wire", "check", "goodwill", "cash", "other"]);

export const markAsFullyRefundedSchema = z.object({
	id: z.cuid2(),
	reason: z.string().min(3).max(500).optional(),
	manualRefundMethod: manualRefundMethodEnum,
});

/**
 * Schema pour la correction des informations client d'une commande
 * Admin only - ex: typo email post-checkout
 */
export const updateOrderCustomerInfoSchema = z.object({
	id: z.cuid2(),
	customerEmail: emailSchema,
	customerName: z.string().min(1).max(100),
	customerPhone: phoneSchema.optional().or(z.literal("")),
});

/**
 * Schema pour l'export CSV unitaire d'une commande (admin)
 */
export const exportSingleOrderSchema = z.object({
	id: z.cuid2(),
});

// ============================================================================
// GET ORDER BY ID SCHEMA
// ============================================================================

/**
 * Schema pour récupérer une commande par son ID
 * Utilisé par la couche data
 */
export const getOrderByIdSchema = z.object({
	id: z.cuid2(),
});

// ============================================================================
// UPDATE ORDER SHIPPING ADDRESS SCHEMA (ADMIN)
// ============================================================================

/**
 * Schema for updating the shipping address of an order before shipment
 * Admin only - used to correct address errors before dispatch
 */
export const updateOrderShippingAddressSchema = z.object({
	id: z.cuid2(),
	shippingFirstName: z.string().min(1).max(50),
	shippingLastName: z.string().min(1).max(50),
	shippingAddress1: z.string().min(1).max(255),
	shippingAddress2: z.string().max(255).optional().or(z.literal("")),
	shippingPostalCode: z
		.string()
		.min(1)
		.max(10)
		.regex(ADDRESS_CONSTANTS.POSTAL_CODE_REGEX, ADDRESS_ERROR_MESSAGES.INVALID_POSTAL_CODE),
	shippingCity: z.string().min(1).max(100),
	shippingCountry: z
		.enum(SHIPPING_COUNTRIES, { message: COUNTRY_ERROR_MESSAGE })
		.default(ADDRESS_CONSTANTS.DEFAULT_COUNTRY),
});

/**
 * Schema for updating the billing address of an order before invoice generation
 * Admin only - used to correct address errors before fiscal invoice (Art. 286 CGI)
 */
export const updateOrderBillingAddressSchema = z
	.object({
		id: z.cuid2(),
		billingSameAsShipping: z.boolean(),
		billingFirstName: z.string().min(1).max(50).optional(),
		billingLastName: z.string().min(1).max(50).optional(),
		billingAddress1: z.string().min(1).max(255).optional(),
		billingAddress2: z.string().max(255).optional().or(z.literal("")),
		billingPostalCode: z
			.string()
			.min(1)
			.max(10)
			.regex(ADDRESS_CONSTANTS.POSTAL_CODE_REGEX, ADDRESS_ERROR_MESSAGES.INVALID_POSTAL_CODE)
			.optional(),
		billingCity: z.string().min(1).max(100).optional(),
		billingCountry: z.enum(SHIPPING_COUNTRIES, { message: COUNTRY_ERROR_MESSAGE }).optional(),
		billingPhone: phoneSchema.optional(),
	})
	.refine(
		(data) =>
			data.billingSameAsShipping ||
			(data.billingFirstName &&
				data.billingLastName &&
				data.billingAddress1 &&
				data.billingPostalCode &&
				data.billingCity &&
				data.billingCountry &&
				data.billingPhone),
		{
			message: "Tous les champs de facturation sont requis si l'adresse diffère de la livraison.",
			path: ["billingSameAsShipping"],
		},
	);
