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
		material: { id: string; name: string } | null;
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

// ============================================================================
// ADMIN TYPES
// ============================================================================

/**
 * Filtres pour la liste admin des notifications
 */
export interface StockNotificationAdminFilters {
	status?: StockNotificationStatus;
	search?: string;
}

/**
 * Paramètres pour récupérer les notifications admin
 */
export interface GetStockNotificationsAdminParams {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
	sortBy?: string;
	filters?: StockNotificationAdminFilters;
}

/**
 * Notification de stock formatée pour l'admin
 */
export interface StockNotificationAdmin {
	id: string;
	email: string;
	status: StockNotificationStatus;
	createdAt: Date;
	notifiedAt: Date | null;
	sku: {
		id: string;
		sku: string;
		inventory: number;
		priceInclTax: number;
		color: { name: string; hex: string } | null;
		material: { id: string; name: string } | null;
		size: string | null;
		images: { url: string; blurDataUrl: string | null; isPrimary: boolean }[];
		product: {
			id: string;
			slug: string;
			title: string;
		};
	};
	user: {
		id: string;
		name: string | null;
		email: string;
	} | null;
}

/**
 * Retour de la fonction getStockNotificationsAdmin
 */
export interface GetStockNotificationsAdminReturn {
	notifications: StockNotificationAdmin[];
	pagination: {
		nextCursor: string | null;
		prevCursor: string | null;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

/**
 * Statistiques des notifications pour l'admin
 */
export interface StockNotificationsStats {
	totalPending: number;
	notifiedThisMonth: number;
	skusWithPendingRequests: number;
}

// ============================================================================
// EXPORT TYPES (RGPD)
// ============================================================================

/**
 * Données exportées pour les notifications de stock (RGPD Art. 20)
 */
export interface StockNotificationExport {
	email: string;
	status: string;
	productTitle: string;
	productSlug: string;
	variant: string | null;
	createdAt: string;
	notifiedAt: string | null;
}
