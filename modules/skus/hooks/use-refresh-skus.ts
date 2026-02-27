"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshSkus } from "@/modules/skus/actions/refresh-skus";

interface UseRefreshSkusOptions {
	productId?: string;
	onSuccess?: () => void;
}

export function useRefreshSkus(options?: UseRefreshSkusOptions) {
	return useRefreshAction(refreshSkus, {
		onSuccess: options?.onSuccess,
		params: options?.productId ? { productId: options.productId } : undefined,
	});
}
