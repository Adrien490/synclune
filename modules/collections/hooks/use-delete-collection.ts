"use client";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { deleteCollection } from "@/modules/collections/actions/delete-collection";

interface UseDeleteCollectionOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteCollection = (options?: UseDeleteCollectionOptions) => {
	return useActionWithToast(deleteCollection, {
		onSuccess: (result) => {
			if (result.message) {
				options?.onSuccess?.(result.message);
			}
		},
	});
};
