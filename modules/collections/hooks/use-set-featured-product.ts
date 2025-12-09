"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ActionStatus } from "@/shared/types/server-action";
import {
	removeFeaturedProduct,
	setFeaturedProduct,
} from "../actions/set-featured-product";

interface UseSetFeaturedProductOptions {
	onSuccess?: () => void;
}

export function useSetFeaturedProduct(options?: UseSetFeaturedProductOptions) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	const setFeatured = (collectionId: string, productId: string) => {
		startTransition(async () => {
			const result = await setFeaturedProduct(collectionId, productId);
			if (result.status === ActionStatus.SUCCESS) {
				toast.success(result.message);
				router.refresh();
				options?.onSuccess?.();
			} else {
				toast.error(result.message);
			}
		});
	};

	const removeFeatured = (collectionId: string, productId: string) => {
		startTransition(async () => {
			const result = await removeFeaturedProduct(collectionId, productId);
			if (result.status === ActionStatus.SUCCESS) {
				toast.success(result.message);
				router.refresh();
				options?.onSuccess?.();
			} else {
				toast.error(result.message);
			}
		});
	};

	return { setFeatured, removeFeatured, isPending };
}
