"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkArchiveProducts } from "@/modules/products/actions/bulk-archive-products";

interface UseBulkArchiveProductsOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour archiver ou désarchiver plusieurs produits en masse
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 *
 * @example
 * ```tsx
 * const { isPending, archiveProducts } = useBulkArchiveProducts({
 *   onSuccess: () => {
 *     router.refresh();
 *   },
 * });
 *
 * const handleBulkArchive = () => {
 *   archiveProducts(["id1", "id2", "id3"], "ARCHIVED");
 * };
 * ```
 */
export const useBulkArchiveProducts = (
	options?: UseBulkArchiveProductsOptions
) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkArchiveProducts,
			createToastCallbacks({
				loadingMessage: "Archivage en cours...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const archiveProducts = (
		productIds: string[],
		targetStatus: "ARCHIVED" | "PUBLIC" = "ARCHIVED"
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productIds", JSON.stringify(productIds));
			formData.append("targetStatus", targetStatus);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		archiveProducts,
	};
};
