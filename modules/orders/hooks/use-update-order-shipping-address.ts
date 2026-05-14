"use client";

import { updateOrderShippingAddress } from "@/modules/orders/actions/update-order-shipping-address";
import { useOrderAction } from "./use-order-action";

export function useUpdateOrderShippingAddress(onSuccess?: () => void) {
	return useOrderAction(updateOrderShippingAddress, {
		loadingMessage: "Mise à jour de l'adresse de livraison…",
		onSuccess,
	});
}
