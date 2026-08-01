"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateProduct } from "@/modules/products/actions/update-product";
import { editProductFormOpts } from "@/modules/products/constants/update-product-form-options";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

interface UseUpdateProductFormOptions {
	product: GetProductReturn;
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
	onValidationError?: (message: string) => void;
}

const getMessage = (result: ActionState): string | undefined =>
	"message" in result && typeof result.message === "string" ? result.message : undefined;

export const useUpdateProductForm = (options: UseUpdateProductFormOptions) => {
	const { product } = options;

	// Get default SKU (first one, should be isDefault: true)
	const defaultSku = product.skus[0];

	// Get all images sorted by isPrimary (primary first)
	const allMedia =
		defaultSku?.images
			.slice()
			.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
			.map((img) => ({
				url: img.url,
				thumbnailUrl: img.thumbnailUrl ?? undefined,
				blurDataUrl: img.blurDataUrl ?? undefined,
				altText: img.altText ?? undefined,
				mediaType: img.mediaType,
				// L'action fait deleteMany + recréation : omettre les dimensions ici
				// les remettait à NULL à chaque édition du produit.
				width: img.width,
				height: img.height,
			})) ?? [];

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateProduct,
			createToastCallbacks<ActionState>({
				loadingMessage: "Mise à jour du produit…",
				showSuccessToast: false,
				showErrorToast: true,
				onSuccess: (result) => {
					const message = getMessage(result);
					if (message) options.onSuccess?.(message);
				},
				onError: (result) => {
					const message = getMessage(result);
					if (!message) return;
					if ("status" in result && result.status === ActionStatus.VALIDATION_ERROR) {
						options.onValidationError?.(message);
						return;
					}
					options.onError?.(message);
				},
			}),
		),
		undefined,
	);

	const form = useAppForm({
		...editProductFormOpts,
		defaultValues: {
			productId: product.id,
			title: product.title,
			description: product.description ?? "",
			typeId: product.type?.id ?? "",
			collectionIds: product.collections.map((pc) => pc.collection.id),
			status: product.status,
			defaultSku: {
				skuId: defaultSku?.id ?? "",
				priceInclTaxEuros: defaultSku ? defaultSku.priceInclTax / 100 : 0,
				compareAtPriceEuros: defaultSku?.compareAtPrice
					? defaultSku.compareAtPrice / 100
					: undefined,
				inventory: defaultSku?.inventory ?? 0,
				isActive: String(defaultSku?.isActive ?? true),
				// Couleurs M2M ordonnées (1re = principale)
				colorIds: defaultSku?.colors.map((c) => c.colorId) ?? [],
				// Matériaux M2M ordonnés (1er = principal)
				materialIds: defaultSku?.materials.map((m) => m.materialId) ?? [],
				size: defaultSku?.size ?? "",
				media: allMedia,
			},
		},
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state ?? {}) as Parameters<typeof mergeForm>[1]),
			[state],
		),
	});

	return {
		form,
		state,
		action,
		isPending,
	};
};
