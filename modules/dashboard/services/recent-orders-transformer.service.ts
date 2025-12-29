import type {
	RecentOrderItem,
	OrderForTransform,
} from "../types/dashboard.types";

export type { OrderForTransform } from "../types/dashboard.types";

// ============================================================================
// RECENT ORDERS TRANSFORMER SERVICE
// Pure functions for transforming order data
// ============================================================================

/**
 * Transforme une commande brute en format d'affichage dashboard
 *
 * @param order - Commande avec données utilisateur
 * @returns Commande formatée pour le dashboard
 */
export function transformRecentOrder(order: OrderForTransform): RecentOrderItem {
	return {
		id: order.id,
		orderNumber: order.orderNumber,
		createdAt: order.createdAt,
		status: order.status,
		paymentStatus: order.paymentStatus,
		total: order.total,
		customerName: order.user?.name || "Invité",
		customerEmail: order.user?.email || "",
	};
}

/**
 * Transforme une liste de commandes pour le dashboard
 *
 * @param orders - Liste de commandes brutes
 * @returns Liste de commandes formatées
 */
export function transformRecentOrders(
	orders: OrderForTransform[]
): RecentOrderItem[] {
	return orders.map(transformRecentOrder);
}
