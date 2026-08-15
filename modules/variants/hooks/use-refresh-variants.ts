"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshVariants } from "@/modules/variants/actions/refresh-variants";

interface UseRefreshVariantsOptions {
	productId?: string;
	onSuccess?: () => void;
}

export function useRefreshVariants(options?: UseRefreshVariantsOptions) {
	return useRefreshAction(refreshVariants, {
		onSuccess: options?.onSuccess,
		params: options?.productId ? { productId: options.productId } : undefined,
	});
}
