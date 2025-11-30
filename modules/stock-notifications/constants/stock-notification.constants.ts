import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Nombre de jours avant expiration d'une demande de notification
 * (si le produit ne revient pas en stock)
 */
export const STOCK_NOTIFICATION_EXPIRY_DAYS = 90;

/**
 * Nombre maximum de notifications à envoyer par batch
 * (pour éviter de surcharger le service d'email)
 */
export const STOCK_NOTIFICATION_BATCH_SIZE = 50;

/**
 * Nombre maximum d'emails à envoyer en parallèle
 * (limite la concurrence pour ne pas surcharger Resend)
 */
export const STOCK_NOTIFICATION_EMAIL_CONCURRENCY = 10;

/**
 * Délai minimum entre deux notifications pour le même email/SKU (en heures)
 * (évite le spam si le stock fluctue)
 */
export const STOCK_NOTIFICATION_COOLDOWN_HOURS = 24;

// ============================================================================
// PRISMA SELECTS
// ============================================================================

/**
 * Select pour récupérer les demandes de notification avec les infos SKU
 */
export const STOCK_NOTIFICATION_WITH_SKU_SELECT = {
	id: true,
	skuId: true,
	userId: true,
	email: true,
	status: true,
	unsubscribeToken: true,
	notifiedAt: true,
	notifiedInventory: true,
	createdAt: true,
	updatedAt: true,
	sku: {
		select: {
			id: true,
			sku: true,
			inventory: true,
			priceInclTax: true,
			color: {
				select: {
					name: true,
					hex: true,
				},
			},
			material: true,
			size: true,
			images: {
				select: {
					url: true,
					altText: true,
					isPrimary: true,
				},
				orderBy: {
					isPrimary: "desc" as const,
				},
				take: 1,
			},
			product: {
				select: {
					id: true,
					slug: true,
					title: true,
				},
			},
		},
	},
} satisfies Prisma.StockNotificationRequestSelect;

/**
 * Select minimal pour vérification d'existence
 */
export const STOCK_NOTIFICATION_MINIMAL_SELECT = {
	id: true,
	email: true,
	status: true,
	unsubscribeToken: true,
} satisfies Prisma.StockNotificationRequestSelect;

// ============================================================================
// PAGINATION
// ============================================================================

export const GET_PENDING_NOTIFICATIONS_DEFAULT_PER_PAGE = 50;
export const GET_PENDING_NOTIFICATIONS_MAX_PER_PAGE = 100;

// ============================================================================
// STATUS LABELS (pour l'admin)
// ============================================================================

export const STOCK_NOTIFICATION_STATUS_LABELS = {
	PENDING: "En attente",
	NOTIFIED: "Notifié",
	EXPIRED: "Expiré",
	CANCELLED: "Annulé",
} as const;
