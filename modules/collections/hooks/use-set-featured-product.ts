"use client";

import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import {
	removeFeaturedProduct,
	setFeaturedProduct,
} from "../actions/set-featured-product";

interface UseSetFeaturedProductOptions {
	onSuccess?: () => void;
}

export function useSetFeaturedProduct(options?: UseSetFeaturedProductOptions) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const [, setFeaturedAction] = useActionState(
		withCallbacks(
			setFeaturedProduct,
			createToastCallbacks({
				onSuccess: () => {
					router.refresh();
					options?.onSuccess?.();
				},
			})
		),
		undefined
	);

	const [, removeFeaturedAction] = useActionState(
		withCallbacks(
			removeFeaturedProduct,
			createToastCallbacks({
				onSuccess: () => {
					router.refresh();
					options?.onSuccess?.();
				},
			})
		),
		undefined
	);

	const setFeatured = (collectionId: string, productId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("collectionId", collectionId);
			formData.append("productId", productId);
			setFeaturedAction(formData);
		});
	};

	const removeFeatured = (collectionId: string, productId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("collectionId", collectionId);
			formData.append("productId", productId);
			removeFeaturedAction(formData);
		});
	};

	return {
		setFeatured,
		removeFeatured,
		isPending,
	};
}
