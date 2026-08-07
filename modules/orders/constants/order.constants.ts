import type { Prisma } from "@/app/generated/prisma/browser";
import type { ReadonlyValues } from "@/shared/types/sort.types";

// ============================================================================
// SELECT DEFINITIONS - ORDER LIST
// ============================================================================

export const GET_ORDERS_SELECT = {
	id: true,
	orderNumber: true,
	// Identité client : colonnes SNAPSHOT uniquement — pas de join `user`
	// (relation quasi toujours NULL depuis le retrait de l'espace client
	// 2026-07-31, achat 100 % invité).
	customerEmail: true,
	customerName: true,
	stripePaymentIntentId: true,
	total: true,
	status: true,
	paymentStatus: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	shippedAt: true,
	paymentMethod: true,
	paidAt: true,
	invoiceNumber: true,
	invoiceStatus: true,
	invoiceGeneratedAt: true,
	createdAt: true,
	updatedAt: true,
	_count: {
		select: {
			items: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// SELECT DEFINITIONS - ORDER DETAIL
// ============================================================================
//
// Deux sélecteurs distincts pour la fiche commande :
//   - GET_ORDER_SELECT_ADMIN (alias GET_ORDER_SELECT) : complet, réservé admin
//   - GET_ORDER_SELECT_CUSTOMER : minimisation RGPD pour l'espace client
//
// Différences customer vs admin :
//   - stripePaymentIntentId : retiré (fingerprint cross-commande inutile côté
//     client). Corollaire : les builders `InvoiceData` doivent le lire en `?? null` —
//     sur un order chargé en select CUSTOMER puis CASTÉ en `GetOrderReturn` (route
//     facture, rendu d'avoir), il vaut `undefined` au runtime alors que le type
//     promet `string | null`.
//   - history.metadata : retiré (peut contenir des PII, ex: previous.email sur ADDRESS_UPDATED)
//   - history.authorName : retiré (fuite identité admin interne)
//
// Cf. audit conformité 2026-05-27 — ORD-COMPLY-001 + ORD-COMPLY-004
// ============================================================================

export const GET_ORDER_SELECT_ADMIN = {
	id: true,
	orderNumber: true,
	stripePaymentIntentId: true,
	customerEmail: true,
	customerName: true,
	subtotal: true,
	shippingCost: true,
	total: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingCountry: true,
	shippingPhone: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	actualDelivery: true,
	shippedAt: true,
	status: true,
	paymentStatus: true,
	paymentMethod: true,
	paidAt: true,
	invoiceNumber: true,
	invoiceStatus: true,
	invoiceGeneratedAt: true,
	creditNoteNumber: true,
	creditNoteGeneratedAt: true,
	// DLQ facturation (EINV-UI-105) — escalade archivage/avoir en échec
	invoiceRetryDeferred: true,
	// Archivage PDF immuable (Art. L102 B LPF) — admin only (URL/hash sensibles)
	invoicePdfUrl: true,
	invoicePdfHash: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			skuId: true,
			productTitle: true,
			productImageUrl: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			price: true,
			quantity: true,
		},
	},
	refunds: {
		select: {
			id: true,
			status: true,
			reason: true,
			amount: true,
			note: true,
			// Pas de `processedAt` : cf. la note de `refund.constants.ts` — colonne
			// vitale côté serveur, aucun lecteur côté rendu.
			createdAt: true,
			// Avoir par refund (Phase 2A — EINV-AUDIT-010)
			creditNoteNumber: true,
			creditNoteGeneratedAt: true,
		},
		orderBy: { createdAt: "desc" as const },
	},
	history: {
		select: {
			id: true,
			action: true,
			previousStatus: true,
			newStatus: true,
			previousPaymentStatus: true,
			newPaymentStatus: true,
			note: true,
			metadata: true,
			authorName: true,
			source: true,
			createdAt: true,
		},
		orderBy: { createdAt: "desc" as const },
		take: 50,
	},
} as const satisfies Prisma.OrderSelect;

/**
 * Alias rétro-compatible. Les types `GetOrderReturn` (cf. order.types.ts)
 * sont dérivés de ce sélecteur (forme la plus large = admin).
 */
export const GET_ORDER_SELECT = GET_ORDER_SELECT_ADMIN;

/**
 * Sélecteur minimisé pour les consommateurs non-admin (espace client).
 * Tout champ retiré ici n'est jamais transporté hors du serveur pour un client.
 */
export const GET_ORDER_SELECT_CUSTOMER = {
	id: true,
	orderNumber: true,
	customerEmail: true,
	customerName: true,
	subtotal: true,
	shippingCost: true,
	total: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingCountry: true,
	shippingPhone: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	actualDelivery: true,
	shippedAt: true,
	status: true,
	paymentStatus: true,
	paymentMethod: true,
	paidAt: true,
	invoiceNumber: true,
	invoiceStatus: true,
	invoiceGeneratedAt: true,
	creditNoteNumber: true,
	creditNoteGeneratedAt: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			skuId: true,
			productTitle: true,
			productImageUrl: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			price: true,
			quantity: true,
		},
	},
	refunds: {
		select: {
			id: true,
			status: true,
			reason: true,
			amount: true,
			note: true,
			// Pas de `processedAt` : cf. la note de `refund.constants.ts` — colonne
			// vitale côté serveur, aucun lecteur côté rendu.
			createdAt: true,
			// Avoir par refund (Phase 2A — EINV-AUDIT-010)
			creditNoteNumber: true,
			creditNoteGeneratedAt: true,
		},
		orderBy: { createdAt: "desc" as const },
	},
	history: {
		select: {
			id: true,
			action: true,
			previousStatus: true,
			newStatus: true,
			previousPaymentStatus: true,
			newPaymentStatus: true,
			note: true,
			source: true,
			createdAt: true,
		},
		orderBy: { createdAt: "desc" as const },
		take: 50,
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// SELECT DEFINITIONS - SURFACES ÉTROITES (suivi, confirmation, e-mails)
// ============================================================================
//
// Ces 4 sélecteurs vivaient en `const` LOCAL dans leur fichier appelant. Ils
// étaient conformes, mais invisibles à `order-select-snapshot-only.regression.test.ts`,
// qui ne peut garder que ce qu'il peut importer : la garde read-side de
// l'invariant #4 (snapshots OrderItem figés) ne couvrait donc que 3 sélecteurs
// d'affichage sur 7. Un `product: { select: { title } }` ajouté ici passait la CI
// et faisait afficher le titre COURANT du produit sur une commande passée.
//
// ⚠️ Tout nouveau sélecteur qui expose `items` appartient à ce fichier, et doit
// être ajouté au `DISPLAY_SELECTS` du test. Un select d'items en local est un
// angle mort, pas un détail de style.
// ============================================================================

/**
 * AUDIT-BIZ-001 — lecture de commande pour la page de suivi **invité**
 * (`/suivi-commande?commande=…&token=…`).
 *
 * Périmètre PII volontairement plus étroit que `GET_ORDER_SELECT_CUSTOMER` : la
 * page est authentifiée par un lien, pas par une session. On expose donc
 * uniquement ce que le client a lui-même saisi ou reçu (articles, montants,
 * adresse de livraison, statuts, suivi transporteur) et RIEN de l'identité
 * légale de facturation ni des identifiants PSP (`stripe*`) ou des notes
 * internes de remboursement.
 */
export const GET_ORDER_TRACKING_SELECT = {
	id: true,
	orderNumber: true,
	createdAt: true,
	status: true,
	paymentStatus: true,
	paidAt: true,
	shippedAt: true,
	actualDelivery: true,
	subtotal: true,
	shippingCost: true,
	total: true,
	paymentMethod: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingCountry: true,
	items: {
		select: {
			id: true,
			productTitle: true,
			productImageUrl: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			price: true,
			quantity: true,
		},
	},
	// Statut seul (pas de montant, pas de `note` libre) : suffit à
	// `getReturnIneligibilityReason` pour détecter `ALREADY_REQUESTED`.
	refunds: {
		select: { status: true },
	},
} as const satisfies Prisma.OrderSelect;

/**
 * Sélecteur allégé de la page de confirmation post-paiement.
 *
 * ⚠️ ARBITRAGE DE CONFIDENTIALITÉ (audit cache 2026-08-07) — ce select rend de la
 * PII (`customerEmail`, `shipping*`, `stripePaymentIntentId`) depuis un scope
 * `"use cache"` **public**, donc un cache SERVEUR partagé, pendant 5 min (profil
 * `checkout`, cf. `data/get-order-for-confirmation.ts`).
 *
 * Ce n'est PAS une fuite cross-client : la clé d'une entrée `"use cache"` est
 * construite sur les ARGUMENTS, ici le couple `(orderId, orderNumber)` — deux
 * commandes donnent deux entrées, et `orderId` est un cuid2 cryptographiquement
 * aléatoire. C'est un choix, et il est délibéré : `"use cache: private"` n'est
 * jamais stocké côté serveur, donc chaque F5 de la page la plus rafraîchie du
 * tunnel (attente du webhook Stripe) retaperait Neon.
 *
 * ⚠️ Ce choix est INVISIBLE au garde-fou `cache-scoping.regression.test.ts`, dont
 * le check d'identité ne reconnaît que `userId`/`sessionId`/`guestSessionId` en
 * paramètre — pas `orderId`. Il tient donc par ce commentaire : élargir ce select
 * à d'autres champs personnels, c'est refaire l'arbitrage, pas l'hériter.
 *
 * (Le commentaire précédent invoquait ici un « ownership check côté wrapper » et
 * un `userId` : les deux sont partis avec `Order.userId` le 2026-08-05.)
 */
export const CONFIRMATION_ORDER_SELECT = {
	id: true,
	orderNumber: true,
	createdAt: true,
	customerEmail: true,
	subtotal: true,
	shippingCost: true,
	total: true,
	paymentStatus: true,
	stripePaymentIntentId: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingCountry: true,
	items: {
		select: {
			id: true,
			productTitle: true,
			productImageUrl: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			price: true,
			quantity: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

/**
 * Renvoi manuel d'un e-mail de commande (`resendOrderEmail`).
 *
 * ⚠️ C'est le sélecteur le plus exposé de la famille : il alimente un e-mail
 * renvoyé potentiellement des MOIS après la commande, censé être « une copie
 * fidèle de l'original ». Un join live y ferait dire à la copie autre chose que
 * l'original — et autre chose que la facture archivée.
 */
export const RESEND_EMAIL_ORDER_SELECT = {
	id: true,
	orderNumber: true,
	status: true,
	// AUDIT-BIZ-001 : requis par `buildOrderTrackingUrl` pour router les
	// commandes invité vers le suivi tokenisé.
	customerEmail: true,
	customerName: true,
	subtotal: true,
	shippingCost: true,
	total: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingCountry: true,
	shippedAt: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	// Sans `shippedAt` le renvoi perdait la ligne « Livraison estimée » : le mail
	// renvoyé n'était pas une copie fidèle de l'original.
	items: {
		select: {
			productTitle: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			quantity: true,
			price: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

/**
 * Encaissement manuel (`markAsPaid`) — lu sous verrou advisory.
 *
 * `items.skuId` est un identifiant, pas un champ d'affichage : il sert au
 * décrément de stock dans la même transaction.
 */
export const MARK_AS_PAID_ORDER_SELECT = {
	id: true,
	orderNumber: true,
	status: true,
	paymentStatus: true,
	customerEmail: true,
	customerName: true,
	subtotal: true,
	shippingCost: true,
	total: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingCountry: true,
	stripePaymentIntentId: true,
	items: {
		select: {
			skuId: true,
			quantity: true,
			productTitle: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			price: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_ORDERS_DEFAULT_PER_PAGE = 20;
export const GET_ORDERS_MAX_RESULTS_PER_PAGE = 100;

// ============================================================================
// FILTRE MONTANT — SSOT de l'unité
// ============================================================================

/**
 * Plafond du filtre de montant, **en centimes** (unité de `Order.total`).
 *
 * ⚠️ La frontière d'unité est ici, et une seule fois. L'URL (`filter_totalMin` /
 * `filter_totalMax`) et les inputs admin sont en **euros** ; `parseFilters` convertit
 * en centimes avant le schéma. Ce plafond avait été dupliqué en trois endroits avec
 * trois unités différentes — un `MAX_PRICE = 500_000` commenté « en centimes » mais
 * poussé tel quel dans un champ en euros, ×100 par `parseFilters` = 50 000 000
 * centimes, soit 5× le plafond du schéma : saisir un montant minimum faisait
 * **planter la liste** (error boundary). Dériver les euros d'ici, jamais l'inverse.
 */
export const ORDER_TOTAL_FILTER_MAX_CENTS = 10_000_000;

/** Même plafond exprimé en euros — valeur à passer aux inputs et au schéma d'URL. */
export const ORDER_TOTAL_FILTER_MAX_EUROS = ORDER_TOTAL_FILTER_MAX_CENTS / 100;

/**
 * Longueur maximale d'un numéro de suivi — alignée sur `Order.trackingNumber
 * VarChar(50)`.
 *
 * ⚠️ `markAsShippedSchema` et `updateTrackingSchema` bornaient à **100**, et les deux
 * actions écrivent `validated.data.trackingNumber` sans troncature : un numéro de 51
 * à 100 caractères (référence transporteur longue collée depuis un back-office)
 * traversait toute la chaîne de validation puis échouait en `22001` Postgres au
 * moment de marquer la commande expédiée — erreur générique, sans indication du
 * champ fautif. Les deux schémas ET les deux inputs dérivent d'ici.
 */
export const TRACKING_NUMBER_MAX_LENGTH = 50;

/**
 * Longueur maximale d'une URL de suivi — alignée sur `Order.trackingUrl
 * VarChar(2048)`. Même classe de défaut que `TRACKING_NUMBER_MAX_LENGTH` :
 * sans borne Zod, une URL trop longue saisie en mode « URL personnalisée »
 * traversait la validation puis échouait en 22001 Postgres, erreur générique.
 * Déclarée dans `zod-prisma-length-parity.contract.test.ts`.
 */
export const TRACKING_URL_MAX_LENGTH = 2048;

export const SORT_OPTIONS = {
	CREATED_DESC: "created-descending",
	CREATED_ASC: "created-ascending",
	TOTAL_DESC: "total-descending",
	TOTAL_ASC: "total-ascending",
	STATUS_ASC: "status-ascending",
	STATUS_DESC: "status-descending",
	PAYMENT_STATUS_ASC: "paymentStatus-ascending",
	PAYMENT_STATUS_DESC: "paymentStatus-descending",
} as const;

export const GET_ORDERS_SORT_FIELDS: ReadonlyValues<typeof SORT_OPTIONS> =
	Object.values(SORT_OPTIONS);

export const SORT_LABELS = {
	[SORT_OPTIONS.CREATED_DESC]: "Plus récentes",
	[SORT_OPTIONS.CREATED_ASC]: "Plus anciennes",
	[SORT_OPTIONS.TOTAL_DESC]: "Montant décroissant",
	[SORT_OPTIONS.TOTAL_ASC]: "Montant croissant",
	[SORT_OPTIONS.STATUS_ASC]: "Statut (A-Z)",
	[SORT_OPTIONS.STATUS_DESC]: "Statut (Z-A)",
	[SORT_OPTIONS.PAYMENT_STATUS_ASC]: "Paiement (A-Z)",
	[SORT_OPTIONS.PAYMENT_STATUS_DESC]: "Paiement (Z-A)",
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ORDER_ERROR_MESSAGES = {
	NOT_FOUND: "La commande n'existe pas.",
	// Garde atomique updateMany count===0 : le statut a changé entre le
	// findUnique et l'update (admin concurrent, webhook, cron).
	CONCURRENT_CHANGE:
		"La commande a été modifiée par une autre opération. Rechargez la page et réessayez.",
	DELETE_FAILED: "Erreur lors de la suppression de la commande.",
	CANCEL_FAILED: "Erreur lors de l'annulation de la commande.",
	HAS_INVOICE:
		"Cette commande ne peut pas être supprimée car une facture a été émise. " +
		"Annulez la commande à la place pour préserver la traçabilité comptable.",
	ALREADY_CANCELLED: "Cette commande est déjà annulée.",
	CANNOT_DELETE_PAID:
		"Cette commande ne peut pas être supprimée car elle a été payée. " +
		"Annulez la commande et procédez à un remboursement à la place.",
	// Mark as paid
	MARK_AS_PAID_FAILED: "Erreur lors du marquage de la commande comme payée.",
	ALREADY_PAID: "Cette commande est déjà payée.",
	CANNOT_PAY_CANCELLED: "Une commande annulée ne peut pas être marquée comme payée.",
	// Mark as shipped
	MARK_AS_SHIPPED_FAILED: "Erreur lors du marquage de la commande comme expédiée.",
	ALREADY_SHIPPED: "Cette commande est déjà expédiée.",
	CANNOT_SHIP_UNPAID: "Une commande non payée ne peut pas être expédiée.",
	CANNOT_SHIP_CANCELLED: "Une commande annulée ne peut pas être expédiée.",
	CANNOT_SHIP_NOT_PROCESSING:
		"Seule une commande en préparation peut être expédiée. Passez-la d'abord en préparation.",
	// Mark as delivered
	MARK_AS_DELIVERED_FAILED: "Erreur lors du marquage de la commande comme livrée.",
	ALREADY_DELIVERED: "Cette commande est déjà livrée.",
	CANNOT_DELIVER_NOT_SHIPPED: "Une commande non expédiée ne peut pas être marquée comme livrée.",
	// Mark as processing
	MARK_AS_PROCESSING_FAILED: "Erreur lors du passage en préparation.",
	UPDATE_FAILED: "Erreur lors de la mise à jour de la commande.",
	ALREADY_PROCESSING: "Cette commande est déjà en cours de préparation.",
	CANNOT_PROCESS_UNPAID: "Une commande non payée ne peut pas être mise en préparation.",
	CANNOT_PROCESS_CANCELLED: "Une commande annulée ne peut pas être mise en préparation.",
	CANNOT_PROCESS_NOT_PENDING: "Seule une commande en attente peut être passée en préparation.",
	// Revert to processing
	REVERT_TO_PROCESSING_FAILED: "Erreur lors de l'annulation de l'expédition.",
	CANNOT_REVERT_NOT_SHIPPED: "Seule une commande expédiée peut être remise en préparation.",
	// Mark as returned
	MARK_AS_RETURNED_FAILED: "Erreur lors du marquage comme retourné.",
	ALREADY_RETURNED: "Cette commande est déjà marquée comme retournée.",
	CANNOT_RETURN_NOT_DELIVERED: "Seule une commande livrée peut être marquée comme retournée.",
	// Undo return
	UNDO_RETURN_FAILED: "Erreur lors de l'annulation du retour.",
	CANNOT_UNDO_NOT_RETURNED:
		"Seule une commande marquée comme retournée peut voir son retour annulé.",
	// Update shipping address
	UPDATE_SHIPPING_ADDRESS_FAILED: "Erreur lors de la modification de l'adresse de livraison.",
	CANNOT_UPDATE_ADDRESS_SHIPPED:
		"L'adresse ne peut plus être modifiée car la commande a été expédiée.",
	// Depuis le retrait des colonnes `billing*` (2026-08-04), `shipping*` est
	// l'adresse imprimée sur la facture et l'avoir — d'où ces deux refus
	// comptables, documentés dans `update-order-shipping-address.ts`.
	CANNOT_UPDATE_ADDRESS_CREDIT_NOTE:
		"L'adresse ne peut plus être modifiée car un avoir a été émis pour cette commande.",
	CANNOT_UPDATE_ADDRESS_INVOICE_ARCHIVING:
		"La facture de cette commande est en cours d'archivage. Réessaie un peu plus tard.",
	// Réutilisé par `update-order-customer-info` (les colonnes `billing*` et leur
	// action ont été retirées le 2026-08-04, ce libellé leur a survécu).
	CANNOT_UPDATE_BILLING_INVOICED:
		"Ces informations ne peuvent plus être modifiées car une facture a été émise.",
	// Update note
	NOTE_NOT_FOUND: "Note introuvable.",
	NOT_NOTE_AUTHOR: "Vous ne pouvez modifier que vos propres notes.",
	// Mark as fully refunded
	MARK_AS_FULLY_REFUNDED_FAILED: "Erreur lors du marquage de la commande comme remboursée.",
	CANNOT_REFUND_NOT_PAID: "Seules les commandes payées peuvent être marquées comme remboursées.",
	ALREADY_FULLY_REFUNDED: "Cette commande est déjà entièrement remboursée.",
	PENDING_STRIPE_REFUNDS:
		"Un remboursement Stripe est en cours de traitement pour cette commande. " +
		"Attendez sa confirmation ou annulez-le avant de marquer la commande comme remboursée manuellement.",
	// Update customer info
	UPDATE_CUSTOMER_INFO_FAILED: "Erreur lors de la modification des informations client.",
	// Export single order
	EXPORT_ORDER_FAILED: "Erreur lors de l'export de la commande.",
} as const;
