"use client";

import { RefundReason } from "@/app/generated/prisma/enums";
import { createRefund } from "@/modules/refunds/actions/create-refund";
import type { OrderItemForRefund } from "@/modules/refunds/data/get-order-for-refund";
import { shouldRestockByDefault } from "@/modules/refunds/utils/refund-utils.browser";
import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import type { RefundItemValue, CreateRefundFormValues } from "../types/refund.types";

// Re-export types for backwards compatibility
export type { RefundItemValue, CreateRefundFormValues };

interface UseCreateRefundFormOptions {
	orderId: string;
	orderItems: OrderItemForRefund[];
	onSuccess?: (message: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Alias pour l'export (rétrocompatibilité)
 */
export const getDefaultRestock = shouldRestockByDefault;

/**
 * Calcule la quantité disponible pour remboursement
 */
export function getAvailableQuantity(item: OrderItemForRefund): number {
	const alreadyRefunded = item.refundItems.reduce(
		(sum, ri) => sum + ri.quantity,
		0
	);
	return item.quantity - alreadyRefunded;
}

/**
 * Initialise les items du formulaire
 */
function initializeItems(
	orderItems: OrderItemForRefund[],
	reason: RefundReason
): RefundItemValue[] {
	return orderItems.map((item) => ({
		orderItemId: item.id,
		quantity: 0,
		restock: getDefaultRestock(reason),
		selected: false,
	}));
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook pour le formulaire de création de remboursement
 * Utilise TanStack Form avec Next.js App Router
 */
export const useCreateRefundForm = (options: UseCreateRefundFormOptions) => {
	const { orderId, orderItems, onSuccess } = options;

	const [state, action, isPending] = useActionState(
		withCallbacks(
			createRefund,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const form = useAppForm({
		defaultValues: {
			orderId,
			reason: RefundReason.CUSTOMER_REQUEST as RefundReason,
			note: "",
			items: initializeItems(orderItems, RefundReason.CUSTOMER_REQUEST),
		} as CreateRefundFormValues,
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	const formErrors = useStore(form.store, (formState) => formState.errors);

	// Valeurs observées du store
	const reason = useStore(form.store, (s) => s.values.reason);
	const items = useStore(form.store, (s) => s.values.items);

	// Calculs dérivés
	const selectedItems = items.filter((item) => item.selected && item.quantity > 0);

	const totalAmount = selectedItems.reduce((sum, item) => {
		const orderItem = orderItems.find((oi) => oi.id === item.orderItemId);
		return sum + (orderItem?.price || 0) * item.quantity;
	}, 0);

	// Items formatés pour l'action
	const itemsForAction = selectedItems.map((item) => ({
		orderItemId: item.orderItemId,
		quantity: item.quantity,
		restock: item.restock,
	}));

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
		// Valeurs calculées
		reason,
		items,
		selectedItems,
		totalAmount,
		itemsForAction,
		// Helpers
		getDefaultRestock,
		getAvailableQuantity,
	};
};
