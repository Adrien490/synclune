"use client";

import { cancelOrder } from "@/modules/orders/actions/cancel-order";
import { useOrderAction } from "./use-order-action";

interface UseCancelOrderOptions {
	onSuccess?: () => void;
}

export function useCancelOrder(options?: UseCancelOrderOptions) {
	return useOrderAction(cancelOrder, {
		loadingMessage: "Annulation de la commande…",
		onSuccess: options?.onSuccess,
	});
}
