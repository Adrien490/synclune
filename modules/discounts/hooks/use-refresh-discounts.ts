"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshDiscounts } from "@/modules/discounts/actions/refresh-discounts";

interface UseRefreshDiscountsOptions {
	onSuccess?: () => void;
}

export function useRefreshDiscounts(options?: UseRefreshDiscountsOptions) {
	return useRefreshAction(refreshDiscounts, {
		onSuccess: options?.onSuccess,
	});
}
