/**
 * Module Stock Notifications
 *
 * Gère les demandes de notification de retour en stock pour les produits
 * en rupture. Permet aux clients de s'inscrire pour être notifiés par email
 * quand un produit qu'ils souhaitent revient en stock.
 *
 * @example
 * // S'inscrire à une notification (server action)
 * import { subscribeToStockNotification } from "@/modules/stock-notifications"
 *
 * @example
 * // Déclencher les notifications après mise à jour de stock
 * import { triggerStockNotificationsIfNeeded } from "@/modules/stock-notifications"
 * await triggerStockNotificationsIfNeeded(skuId, oldInventory, newInventory)
 */

// ============================================================================
// ACTIONS
// ============================================================================
export { subscribeToStockNotification } from "./actions/subscribe-to-stock-notification";
export {
	unsubscribeFromStockNotification,
	cancelStockNotification,
} from "./actions/unsubscribe-from-stock-notification";
export {
	notifyStockAvailable,
	notifyStockAvailableAction,
	processAllPendingStockNotifications,
} from "./actions/notify-stock-available";
export {
	cleanupExpiredNotifications,
	cleanupExpiredNotificationsAction,
} from "./actions/cleanup-expired-notifications";
export { bulkCancelStockNotifications } from "./actions/bulk-cancel-stock-notifications";
export { bulkDeleteStockNotifications } from "./actions/bulk-delete-stock-notifications";

// ============================================================================
// HOOKS
// ============================================================================
export { useCancelStockNotification } from "./hooks/use-cancel-stock-notification";
export { useNotifyStockAvailable } from "./hooks/use-notify-stock-available";
export { useCleanupExpiredNotifications } from "./hooks/use-cleanup-expired-notifications";
export { useSubscribeToStockNotification } from "./hooks/use-subscribe-to-stock-notification";
export { useUnsubscribeFromStockNotification } from "./hooks/use-unsubscribe-from-stock-notification";
export {
	useBulkCancelStockNotifications,
	useBulkDeleteStockNotifications,
} from "./hooks/use-bulk-stock-notification-actions";

// ============================================================================
// DATA
// ============================================================================
export {
	getPendingNotificationsBySku,
	countPendingNotificationsBySku,
	hasExistingPendingNotification,
} from "./data/get-pending-notifications-by-sku";
export {
	getNotificationByToken,
	getNotificationsByUser,
	getNotificationsByEmail,
} from "./data/get-notification-by-token";

// ============================================================================
// UTILS
// ============================================================================
export {
	triggerStockNotificationsIfNeeded,
	countPendingNotificationsForSku,
	isAlreadySubscribed,
} from "./utils/trigger-stock-notifications";

// ============================================================================
// SCHEMAS
// ============================================================================
export {
	subscribeToStockNotificationSchema,
	unsubscribeFromStockNotificationSchema,
	notifyStockAvailableSchema,
	getPendingNotificationsSchema,
} from "./schemas/stock-notification.schemas";
export type {
	SubscribeToStockNotificationInput,
	UnsubscribeFromStockNotificationInput,
	NotifyStockAvailableInput,
	GetPendingNotificationsInput,
} from "./schemas/stock-notification.schemas";

// ============================================================================
// TYPES
// ============================================================================
export type {
	StockNotificationRequest,
	StockNotificationRequestWithSku,
	GetPendingNotificationsParams,
	GetPendingNotificationsReturn,
	BackInStockEmailData,
	NotifyStockAvailableResult,
} from "./types/stock-notification.types";

// ============================================================================
// CONSTANTS
// ============================================================================
export {
	STOCK_NOTIFICATIONS_CACHE_TAGS,
	getStockNotificationInvalidationTags,
	getNotifyStockInvalidationTags,
} from "./constants/cache";
export {
	STOCK_NOTIFICATION_EXPIRY_DAYS,
	STOCK_NOTIFICATION_BATCH_SIZE,
	STOCK_NOTIFICATION_COOLDOWN_HOURS,
	STOCK_NOTIFICATION_EMAIL_CONCURRENCY,
	STOCK_NOTIFICATION_STATUS_LABELS,
} from "./constants/stock-notification.constants";
