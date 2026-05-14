"use client";

import { updateOrderBillingAddress } from "@/modules/orders/actions/update-order-billing-address";
import { useOrderAction } from "./use-order-action";

export function useUpdateOrderBillingAddress(onSuccess?: () => void) {
	return useOrderAction(updateOrderBillingAddress, {
		loadingMessage: "Mise à jour de l'adresse de facturation…",
		onSuccess,
	});
}
