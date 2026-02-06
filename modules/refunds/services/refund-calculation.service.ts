/**
 * Service de calcul des remboursements
 *
 * Fonctions pures pour calculer les montants et quantités remboursables.
 */

import type { RefundReason } from "@/app/generated/prisma/enums";
import { shouldRestockByDefault } from "./refund-restock.service";
import type { RefundItemValue } from "../types/refund.types";

// Re-export pour retro-compatibilite
export type { RefundItemValue } from "../types/refund.types";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderItemForRefundCalc {
	id: string;
	quantity: number;
	price: number;
	refundItems: { quantity: number }[];
}

// ============================================================================
// QUANTITY CALCULATIONS
// ============================================================================

/**
 * Calcule la quantité disponible pour remboursement d'un article
 *
 * @param item - Article de commande avec ses remboursements existants
 * @returns Quantité encore remboursable
 *
 * @example
 * ```ts
 * const available = getAvailableQuantity({
 *   quantity: 3,
 *   refundItems: [{ quantity: 1 }],
 * });
 * // 2 (3 commandés - 1 déjà remboursé)
 * ```
 */
export function getAvailableQuantity(item: OrderItemForRefundCalc): number {
	const alreadyRefunded = item.refundItems.reduce(
		(sum, ri) => sum + ri.quantity,
		0
	);
	return item.quantity - alreadyRefunded;
}

/**
 * Calcule le montant total déjà remboursé pour une commande
 *
 * @param refunds - Liste des remboursements existants
 * @returns Montant total déjà remboursé en centimes
 */
export function calculateAlreadyRefunded(
	refunds: { amount: number }[]
): number {
	return refunds.reduce((sum, r) => sum + r.amount, 0);
}

/**
 * Calcule le montant maximum remboursable
 *
 * @param orderTotal - Total de la commande en centimes
 * @param alreadyRefunded - Montant déjà remboursé en centimes
 * @returns Montant maximum encore remboursable
 */
export function calculateMaxRefundable(
	orderTotal: number,
	alreadyRefunded: number
): number {
	return orderTotal - alreadyRefunded;
}

// ============================================================================
// AMOUNT CALCULATIONS
// ============================================================================

/**
 * Calcule le montant total des articles sélectionnés pour remboursement
 *
 * @param selectedItems - Articles sélectionnés avec leurs quantités
 * @param orderItems - Articles de la commande originale (pour les prix)
 * @returns Montant total en centimes
 *
 * @example
 * ```ts
 * const total = calculateRefundAmount(
 *   [{ orderItemId: "1", quantity: 2, ... }],
 *   [{ id: "1", price: 5000 }]
 * );
 * // 10000 (2 × 50€)
 * ```
 */
export function calculateRefundAmount(
	selectedItems: RefundItemValue[],
	orderItems: OrderItemForRefundCalc[]
): number {
	return selectedItems.reduce((sum, item) => {
		const orderItem = orderItems.find((oi) => oi.id === item.orderItemId);
		return sum + (orderItem?.price || 0) * item.quantity;
	}, 0);
}

// ============================================================================
// ITEM INITIALIZATION
// ============================================================================

/**
 * Initialise les valeurs des articles pour le formulaire de remboursement
 *
 * @param orderItems - Articles de la commande
 * @param reason - Motif du remboursement (détermine le restock par défaut)
 * @returns Valeurs initiales pour chaque article
 */
export function initializeRefundItems(
	orderItems: OrderItemForRefundCalc[],
	reason: RefundReason
): RefundItemValue[] {
	return orderItems.map((item) => ({
		orderItemId: item.id,
		quantity: 0,
		restock: shouldRestockByDefault(reason),
		selected: false,
	}));
}

/**
 * Met à jour le restock par défaut pour tous les articles selon le motif
 *
 * @param items - Articles actuels
 * @param reason - Nouveau motif
 * @returns Articles mis à jour
 */
export function updateItemsRestock(
	items: RefundItemValue[],
	reason: RefundReason
): RefundItemValue[] {
	const defaultRestock = shouldRestockByDefault(reason);
	return items.map((item) => ({
		...item,
		restock: defaultRestock,
	}));
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Valide et ajuste une quantité de remboursement
 *
 * @param requestedQuantity - Quantité demandée
 * @param availableQuantity - Quantité maximale disponible
 * @returns Quantité validée (entre 0 et availableQuantity)
 */
export function validateRefundQuantity(
	requestedQuantity: number,
	availableQuantity: number
): number {
	return Math.max(0, Math.min(requestedQuantity, availableQuantity));
}

/**
 * Vérifie si un remboursement peut être soumis
 *
 * @param selectedItems - Articles sélectionnés
 * @param totalAmount - Montant total du remboursement
 * @param maxRefundable - Montant maximum remboursable
 * @returns true si le remboursement est valide
 */
export function canSubmitRefund(
	selectedItems: RefundItemValue[],
	totalAmount: number,
	maxRefundable: number
): boolean {
	return (
		selectedItems.length > 0 &&
		totalAmount > 0 &&
		totalAmount <= maxRefundable
	);
}

/**
 * Filtre les articles sélectionnés avec une quantité > 0
 *
 * @param items - Tous les articles
 * @returns Articles sélectionnés valides
 */
export function getSelectedItems(items: RefundItemValue[]): RefundItemValue[] {
	return items.filter((item) => item.selected && item.quantity > 0);
}

/**
 * Formate les articles pour l'action server
 *
 * @param selectedItems - Articles sélectionnés
 * @returns Articles formatés pour la server action
 */
export function formatItemsForAction(
	selectedItems: RefundItemValue[]
): { orderItemId: string; quantity: number; restock: boolean }[] {
	return selectedItems.map((item) => ({
		orderItemId: item.orderItemId,
		quantity: item.quantity,
		restock: item.restock,
	}));
}
