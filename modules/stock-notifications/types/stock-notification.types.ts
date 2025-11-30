import { StockNotificationStatus } from "@/app/generated/prisma/client";

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Demande de notification de retour en stock (vue simplifiée)
 */
export interface StockNotificationRequest {
	id: string;
	skuId: string;
	userId: string | null;
	email: string;
	status: StockNotificationStatus;
	unsubscribeToken: string;
	notifiedAt: Date | null;
	notifiedInventory: number | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Demande de notification avec les infos du SKU et produit
 */
export interface StockNotificationRequestWithSku extends StockNotificationRequest {
	sku: {
		id: string;
		sku: string;
		inventory: number;
		priceInclTax: number;
		color: { name: string; hex: string } | null;
		materialRelation: { id: string; name: string } | null;
		size: string | null;
		images: Array<{ url: string; altText: string | null; isPrimary: boolean }>;
		product: {
			id: string;
			slug: string;
			title: string;
		};
	};
}

// ============================================================================
// DATA FETCHING TYPES
// ============================================================================

/**
 * Paramètres pour récupérer les demandes en attente
 */
export interface GetPendingNotificationsParams {
	skuId?: string;
	cursor?: string;
	perPage?: number;
}

/**
 * Retour de la fonction getPendingNotifications
 */
export interface GetPendingNotificationsReturn {
	notifications: StockNotificationRequestWithSku[];
	pagination: {
		nextCursor: string | null;
		hasNextPage: boolean;
	};
}

/**
 * Données pour l'email de notification de retour en stock
 */
export interface BackInStockEmailData {
	email: string;
	productTitle: string;
	productSlug: string;
	skuColor: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	skuImageUrl: string | null;
	price: number;
	availableQuantity: number;
	unsubscribeToken: string;
}

// ============================================================================
// ACTION RESULT TYPES
// ============================================================================

/**
 * Résultat de l'action notify (pour traçabilité)
 */
export interface NotifyStockAvailableResult {
	totalNotifications: number;
	successfulNotifications: number;
	failedNotifications: number;
	notificationIds: string[];
}
