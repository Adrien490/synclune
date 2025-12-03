"use client";

import { RefundReason } from "@/app/generated/prisma/browser";
import { createRefund } from "@/modules/refunds/actions/create-refund";
import type { OrderItemForRefund } from "@/modules/refunds/data/get-order-for-refund";
import { useAppForm } from "@/shared/components/tanstack-form";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface RefundItemValue {
	orderItemId: string;
	quantity: number;
	restock: boolean;
	selected: boolean;
}

export interface CreateRefundFormValues {
	orderId: string;
	reason: RefundReason;
	note: string;
	items: RefundItemValue[];
}

interface UseCreateRefundFormOptions {
	orderId: string;
	orderItems: OrderItemForRefund[];
	onSuccess?: (message: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Détermine si le restock est recommandé selon le motif
 */
export function getDefaultRestock(reason: RefundReason): boolean {
	return (
		reason === RefundReason.CUSTOMER_REQUEST ||
		reason === RefundReason.WRONG_ITEM
	);
}

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
