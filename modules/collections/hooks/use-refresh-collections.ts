"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshCollections } from "@/modules/collections/actions/refresh-collections";

interface UseRefreshCollectionsOptions {
	onSuccess?: () => void;
}

export const useRefreshCollections = (options?: UseRefreshCollectionsOptions) => {
	return useRefreshAction(refreshCollections, {
		onSuccess: options?.onSuccess,
	});
};
