"use client";

import { bulkDeleteProductTypes } from "@/modules/product-types/actions/bulk-delete-product-types";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseBulkDeleteProductTypesOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkDeleteProductTypes = (options?: UseBulkDeleteProductTypesOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteProductTypes,
			createToastCallbacks({
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

	return {
		state,
		action,
		isPending,
	};
};
