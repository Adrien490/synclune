"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateProduct } from "@/modules/products/actions/update-product";
import { editProductFormOpts } from "@/modules/products/constants/update-product-form-options";
import type { GetProductReturn } from "@/modules/products/types/product.types";

interface UseUpdateProductFormOptions {
	product: GetProductReturn;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire d'édition de produit
 * Utilise TanStack Form avec Next.js App Router
 * Pré-remplit le formulaire avec les données du produit
 */
export const useUpdateProductForm = (options: UseUpdateProductFormOptions) => {
	const { product } = options;

	// Get default SKU (first one, should be isDefault: true)
	const defaultSku = product.skus[0];

	// Get primary image and gallery from SKU images
	const primaryImage = defaultSku?.images.find((img) => img.isPrimary);
	const galleryImages = defaultSku?.images.filter((img) => !img.isPrimary) || [];

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateProduct,
			createToastCallbacks({
				loadingMessage: "Modification du produit en cours...",
				onSuccess: (result: unknown) => {
					// Call the custom success callback if provided
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

	const form = useAppForm({
		...editProductFormOpts,
		defaultValues: {
			productId: product.id,
			title: product.title,
			description: product.description || "",
			typeId: product.type?.id || "",
			collectionIds: product.collections?.map((pc) => pc.collection.id) || [],
			status: product.status,
			defaultSku: {
				skuId: defaultSku?.id || "",
				priceInclTaxEuros: defaultSku ? defaultSku.priceInclTax / 100 : 0,
				compareAtPriceEuros: defaultSku?.compareAtPrice ? defaultSku.compareAtPrice / 100 : undefined,
				inventory: defaultSku?.inventory || 0,
				isActive: defaultSku?.isActive ?? true,
				colorId: defaultSku?.color?.id || "",
				material: defaultSku?.material || "",
				size: defaultSku?.size || "",
				primaryImage: primaryImage
					? {
							url: primaryImage.url,
							thumbnailUrl: primaryImage.thumbnailUrl || undefined,
							altText: primaryImage.altText || undefined,
							mediaType: primaryImage.mediaType,
					  }
					: undefined,
				galleryMedia: galleryImages.map((img) => ({
					url: img.url,
					thumbnailUrl: img.thumbnailUrl || undefined,
					altText: img.altText || undefined,
					mediaType: img.mediaType,
				})),
			},
		},
		// Merge server state with form state for validation errors
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	// Subscribe to form errors for display
	const formErrors = useStore(form.store, (formState) => formState.errors);

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
	};
};
