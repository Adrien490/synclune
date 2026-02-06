"use client";

import { RefundReason } from "@/app/generated/prisma/enums";
import { createRefund } from "@/modules/refunds/actions/create-refund";
import type { OrderItemForRefund } from "@/modules/refunds/data/get-order-for-refund";
import { shouldRestockByDefault } from "@/modules/refunds/services/refund-restock.service";
import {
	getAvailableQuantity as getAvailableQuantityService,
	initializeRefundItems,
	getSelectedItems,
	calculateRefundAmount,
	formatItemsForAction,
} from "@/modules/refunds/services/refund-calculation.service";
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
// HELPERS (re-exports pour rétrocompatibilité)
// ============================================================================

/**
 * @deprecated Importer depuis @/modules/refunds/services/refund-restock.service
 */
export const getDefaultRestock = shouldRestockByDefault;

/**
 * @deprecated Importer depuis @/modules/refunds/services/refund-calculation.service
 */
export const getAvailableQuantity = getAvailableQuantityService;

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
			items: initializeRefundItems(orderItems, RefundReason.CUSTOMER_REQUEST),
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

	// Calculs dérivés (utilise les services)
	const selectedItems = getSelectedItems(items);
	const totalAmount = calculateRefundAmount(selectedItems, orderItems);
	const itemsForAction = formatItemsForAction(selectedItems);

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
