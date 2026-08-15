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

	// Variante principale = première du produit (ordre stable par id)
	const defaultVariant = product.variants[0];

	// Médias du PRODUIT dans l'ordre canonique (position, id) — le select les
	// livre déjà triés (schéma lean : le média vit sur le produit).
	const allMedia = product.media.map((m) => ({
		url: m.url,
		alt: m.alt ?? undefined,
		type: m.type,
	}));

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
			name: product.name,
			description: product.description,
			priceEuros: product.priceCents / 100,
			active: product.active ? ("true" as const) : ("false" as const),
			typeId: product.type?.id ?? "",
			collectionIds: product.collections.map((collection) => collection.id),
			media: allMedia,
			defaultVariant: {
				variantId: defaultVariant?.id ?? "",
				// Override — vide = hérite du prix produit.
				priceEuros:
					defaultVariant?.priceCents != null ? defaultVariant.priceCents / 100 : ("" as const),
				originalStock: defaultVariant?.stock ?? 0,
				stock: defaultVariant?.stock ?? 0,
				active: defaultVariant?.active ? ("true" as const) : ("false" as const),
				colorId: defaultVariant?.color?.id ?? "",
				materialId: defaultVariant?.material?.id ?? "",
				size: defaultVariant?.size ?? "",
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
