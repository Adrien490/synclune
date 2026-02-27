"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshProducts } from "@/modules/products/actions/refresh-products";

interface UseRefreshProductsOptions {
	onSuccess?: () => void;
}

export function useRefreshProducts(options?: UseRefreshProductsOptions) {
	return useRefreshAction(refreshProducts, {
		onSuccess: options?.onSuccess,
	});
}
