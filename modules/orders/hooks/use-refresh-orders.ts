"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshOrders } from "@/modules/orders/actions/refresh-orders";

interface UseRefreshOrdersOptions {
	onSuccess?: () => void;
}

export function useRefreshOrders(options?: UseRefreshOrdersOptions) {
	return useRefreshAction(refreshOrders, {
		onSuccess: options?.onSuccess,
	});
}
