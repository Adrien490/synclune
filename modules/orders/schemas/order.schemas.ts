import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { z } from "zod";
import { formBooleanSchema } from "@/shared/schemas/boolean.schema";
import { OrderStatus, PaymentStatus, InvoiceStatus } from "@/app/generated/prisma/client";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { ADDRESS_CONSTANTS } from "@/shared/constants/address.constants";
import {
	addressLineOptionalSchema,
	addressLineSchema,
	citySchema,
	nameFieldSchema,
	postalCodeSchema,
	shippingCountrySchema,
} from "@/shared/schemas/address.schema";
import { emailSchema } from "@/shared/schemas/email.schemas";
import { phoneSchema } from "@/shared/schemas/phone.schemas";
import { stringOrDateSchema } from "@/shared/schemas/date.schemas";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_ORDERS_DEFAULT_PER_PAGE,
	GET_ORDERS_MAX_RESULTS_PER_PAGE,
	ORDER_TOTAL_FILTER_MAX_CENTS,
	SORT_OPTIONS,
	TRACKING_NUMBER_MAX_LENGTH,
	TRACKING_URL_MAX_LENGTH,
} from "../constants/order.constants";
import { isAllowedTrackingHost } from "../constants/carrier-urls";

// ============================================================================
// HELPERS
// ============================================================================

const orderStatusSchema = z.union([z.enum(OrderStatus), z.array(z.enum(OrderStatus))]).optional();

const paymentStatusSchema = z
	.union([z.enum(PaymentStatus), z.array(z.enum(PaymentStatus))])
	.optional();

const invoiceStatusSchema = z
	.union([z.enum(InvoiceStatus), z.array(z.enum(InvoiceStatus))])
	.optional();

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const orderFiltersSchema = z
	.object({
		status: orderStatusSchema,
		paymentStatus: paymentStatusSchema,
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
	search: z.string().max(TEXT_LIMITS.SEARCH.max).optional(),
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
		// Aligné sur `Order.trackingUrl VarChar(2048)` — déclaré dans le contrat
		// zod-prisma-length-parity. Sans borne, une URL trop longue collée en mode
		// « URL personnalisée » passait Zod puis levait un 22001 Postgres générique.
		.max(
			TRACKING_URL_MAX_LENGTH,
			`L'URL de suivi ne peut pas dépasser ${TRACKING_URL_MAX_LENGTH} caractères`,
		)
		.refine((url) => /^https?:\/\//i.test(url), {
			message: "L'URL de suivi doit commencer par http:// ou https://",
		})
		.optional(),
);

/**
 * ORD-SEC-009 — allowlist d'hôtes sur `trackingUrl` (portée objet, car la règle
 * dépend du transporteur choisi) :
 *
 * - transporteur connu (ou non renseigné) → l'hôte doit appartenir aux domaines
 *   dérivés de `CARRIER_TRACKING_URLS` (sous-domaines inclus). Bloque à la fois
 *   la redirection ouverte à portée admin (l'URL part au client dans l'email
 *   d'expédition et sur `/suivi-commande`) et la désynchronisation carrier/URL ;
 * - `carrier === "autre"` → échappatoire EXPLICITE (transporteur hors liste,
 *   ex. coursier local) : http(s) + borne de longueur seulement.
 *
 * L'URL malformée est laissée à `trackingUrlSchema` (déjà signalée).
 */
const enforceTrackingUrlHostAllowlist = (
	data: { carrier?: string; trackingUrl?: string },
	ctx: z.RefinementCtx,
): void => {
	if (!data.trackingUrl || data.carrier === "autre") return;

	let hostname: string;
	try {
		hostname = new URL(data.trackingUrl).hostname;
	} catch {
		return;
	}

	if (!isAllowedTrackingHost(hostname)) {
		ctx.addIssue({
			code: "custom",
			path: ["trackingUrl"],
			message:
				"L'URL de suivi doit pointer vers le site d'un transporteur connu — choisis « Autre transporteur » pour une URL personnalisée.",
		});
	}
};

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

/**
 * Champ `carrier` côté FormData : le picker n'a plus de valeur par défaut
 * (il pré-remplissait « Colissimo » sur les commandes sans transporteur —
 * attribution inventée persistée en base, audit 2026-08-01). Le hidden Radix
 * poste alors `""`, et `safeFormGet` rend `null` si le champ manque : les deux
 * doivent valoir « non renseigné », pas une erreur d'enum.
 */
const carrierFieldSchema = z.preprocess(
	(value) => (value === "" || value === null ? undefined : value),
	carrierEnum.optional(),
);

// ============================================================================
// MARK AS SHIPPED SCHEMA
// ============================================================================

/**
 * Schema pour marquer une commande comme expédiée
 * Requiert un numéro de suivi
 */
export const markAsShippedSchema = z
	.object({
		id: z.cuid2(),
		trackingNumber: z
			.string()
			.min(1, "Le numéro de suivi est requis")
			.max(
				TRACKING_NUMBER_MAX_LENGTH,
				`Le numéro de suivi ne peut pas dépasser ${TRACKING_NUMBER_MAX_LENGTH} caractères`,
			),
		trackingUrl: trackingUrlSchema,
		carrier: carrierFieldSchema,
		// SSOT `formBooleanSchema` : cette ré-implémentation n'acceptait que
		// "true"/"false", là où la SSOT couvre aussi "1"/"0"/"on"/"off"/"yes"/"no"
		// (sur-ensemble, donc sans régression) et rejette explicitement le reste.
		sendEmail: formBooleanSchema.optional().default(true),
	})
	.superRefine(enforceTrackingUrlHostAllowlist);

// ============================================================================
// UPDATE TRACKING SCHEMA
// ============================================================================

/**
 * Schema pour mettre à jour les informations de suivi d'une commande déjà expédiée
 * Permet de modifier le numéro de suivi, l'URL et le transporteur
 */
export const updateTrackingSchema = z
	.object({
		id: z.cuid2(),
		trackingNumber: z
			.string()
			.min(1, "Le numéro de suivi est requis")
			.max(
				TRACKING_NUMBER_MAX_LENGTH,
				`Le numéro de suivi ne peut pas dépasser ${TRACKING_NUMBER_MAX_LENGTH} caractères`,
			),
		trackingUrl: trackingUrlSchema,
		carrier: carrierFieldSchema,
	})
	.superRefine(enforceTrackingUrlHostAllowlist);

// ============================================================================
// MARK AS DELIVERED SCHEMA
// ============================================================================

/**
 * Schema pour marquer une commande comme livrée
 * Utilisé pour forcer le statut si le webhook transporteur ne fonctionne pas
 */
// ============================================================================
// TRANSITIONS DE STATUT (action générique)
// ============================================================================

/**
 * Clés des transitions NON MONÉTAIRES, consommées par `updateOrderStatus`.
 *
 * Une CLÉ, pas un statut cible : `processing` et `revert-to-processing` visent
 * tous deux `PROCESSING`, mais depuis des états différents et avec des effets
 * différents (le second efface le suivi d'expédition).
 *
 * ⚠️ Cet enum est la garde d'entrée de l'endpoint RPC : `"use server"` publie
 * l'action hors UI, et le type TypeScript est effacé à l'exécution.
 */
const ORDER_TRANSITION_KEYS = [
	"processing",
	"delivered",
	"returned",
	"revert-to-processing",
	"undo-return",
] as const;

export type OrderTransitionKey = (typeof ORDER_TRANSITION_KEYS)[number];

export const updateOrderStatusSchema = z.object({
	id: z.cuid2(),
	transition: z.enum(ORDER_TRANSITION_KEYS),
	// Borne alignée sur `OrderHistory.note` (`@db.Text`, pas de VarChar) et sur
	// l'ancienne `revertToProcessingSchema`. Obligatoire ou non selon la
	// transition — arbitré côté action, là où la config le sait.
	reason: z.string().max(500, "La raison ne peut pas dépasser 500 caractères").optional(),
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
	// Pas de téléphone ici : il vit dans `shippingPhone` (capté au checkout,
	// obligatoire) et s'édite avec l'adresse de livraison.
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
	// Briques partagées (`shared/schemas/address.schema.ts`) — mêmes bornes et même
	// regex de code postal que le checkout, posées une seule fois.
	shippingFirstName: nameFieldSchema,
	shippingLastName: nameFieldSchema,
	shippingAddress1: addressLineSchema,
	shippingAddress2: addressLineOptionalSchema.or(z.literal("")),
	shippingPostalCode: postalCodeSchema,
	shippingCity: citySchema,
	shippingCountry: shippingCountrySchema.default(ADDRESS_CONSTANTS.DEFAULT_COUNTRY),
	// Seul champ éditable portant le téléphone du client depuis le retrait de
	// `Order.customerPhone` (2026-08-04) : sans lui, une faute de frappe sur le
	// numéro donné au transporteur ne serait plus corrigeable nulle part.
	shippingPhone: phoneSchema.optional().or(z.literal("")),
});

// Il n'existe PAS de schéma d'adresse de facturation : en B2C de vente à
// distance, l'adresse de facturation est l'adresse de livraison ci-dessus, et
// c'est elle que le PDF imprime sous « Facturé à » (cf. `buildBillingAddress`).
