"use client";

import { updateOrderCustomerInfo } from "@/modules/orders/actions/update-order-customer-info";
import { useOrderAction } from "./use-order-action";

export function useUpdateOrderCustomerInfo(onSuccess?: () => void) {
	return useOrderAction(updateOrderCustomerInfo, {
		loadingMessage: "Mise à jour des informations client…",
		onSuccess,
	});
}
