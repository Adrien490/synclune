import { z } from "zod";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import type {
	SkuData,
	SkuValidationResult,
	SkuDetailsResult,
	BatchSkuValidationResult,
} from "@/modules/cart/types/sku-validation.types";
import { validateSkuSchema, getSkuDetailsSchema } from "@/modules/cart/schemas/cart.schemas";
import {
	fetchSkuForValidation,
	fetchSkuForDetails,
	fetchSkusForBatchValidation,
} from "@/modules/cart/data/get-sku-for-validation";

// Action: Valider un SKU et son stock
export async function validateSkuAndStock(input: {
	skuId: string;
	quantity: number;
}): Promise<SkuValidationResult> {
	try {
		// Validation des inputs
		const validatedInput = validateSkuSchema.parse(input);

		const sku = await fetchSkuForValidation(validatedInput.skuId);

		if (!sku) {
			return {
				success: false,
				error: CART_ERROR_MESSAGES.SKU_NOT_FOUND,
			};
		}

		// Vérifier les soft deletes (SKU ou Product supprimé)
		if (sku.deletedAt || sku.product.deletedAt) {
			return {
				success: false,
				error: CART_ERROR_MESSAGES.PRODUCT_DELETED,
			};
		}

		if (!sku.isActive) {
			return {
				success: false,
				error: CART_ERROR_MESSAGES.SKU_INACTIVE,
			};
		}

		if (sku.product.status !== "PUBLIC") {
			return {
				success: false,
				error: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC,
			};
		}

		if (sku.inventory === 0) {
			return {
				success: false,
				error: CART_ERROR_MESSAGES.OUT_OF_STOCK,
			};
		}

		if (sku.inventory < validatedInput.quantity) {
			return {
				success: false,
				error: CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(sku.inventory),
			};
		}

		return {
			success: true,
			data: {
				sku: {
					id: sku.id,
					sku: sku.sku,
					priceInclTax: sku.priceInclTax,
					compareAtPrice: sku.compareAtPrice,
					inventory: sku.inventory,
					isActive: sku.isActive,
					material: sku.material?.name || undefined,
					colorId: sku.colorId || undefined,
					color: sku.color
						? {
								id: sku.color.id,
								name: sku.color.name,
								hex: sku.color.hex,
							}
						: undefined,
					size: sku.size || undefined,
					product: {
						id: sku.product.id,
						title: sku.product.title,
						slug: sku.product.slug,
						description: sku.product.description || null,
					},
					images: sku.images.map((img) => ({
						url: img.url,
						altText: img.altText || undefined,
						isPrimary: img.isPrimary,
					})),
				},
			},
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: error.issues[0]?.message || CART_ERROR_MESSAGES.INVALID_DATA,
			};
		}

		return {
			success: false,
			error: CART_ERROR_MESSAGES.GENERAL_ERROR,
		};
	}
}

// Action: Récupérer les détails complets d'un SKU pour l'affichage
export async function getSkuDetails(input: {
	skuId: string;
}): Promise<SkuDetailsResult> {
	try {
		// Validation des inputs
		const validatedInput = getSkuDetailsSchema.parse(input);

		const sku = await fetchSkuForDetails(validatedInput.skuId);

		if (!sku) {
			return {
				success: false,
				error: CART_ERROR_MESSAGES.SKU_NOT_FOUND,
			};
		}

		return {
			success: true,
			data: {
				sku: {
					id: sku.id,
					sku: sku.sku,
					priceInclTax: sku.priceInclTax,
					compareAtPrice: sku.compareAtPrice,
					inventory: sku.inventory,
					isActive: sku.isActive,
					material: sku.material?.name || undefined,
					colorId: sku.colorId || undefined,
					color: sku.color
						? {
								id: sku.color.id,
								name: sku.color.name,
								hex: sku.color.hex,
							}
						: undefined,
					size: sku.size || undefined,
					product: {
						id: sku.product.id,
						title: sku.product.title,
						slug: sku.product.slug,
						description: sku.product.description || null,
					},
					images: sku.images.map((img) => ({
						url: img.url,
						altText: img.altText || undefined,
						isPrimary: img.isPrimary,
					})),
				},
			},
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: error.issues[0]?.message || CART_ERROR_MESSAGES.INVALID_DATA,
			};
		}

		return {
			success: false,
			error: CART_ERROR_MESSAGES.GENERAL_ERROR,
		};
	}
}

// Action: Valider plusieurs SKUs d'un coup (pour validation du panier complet)
// Optimisé: utilise une seule requête DB au lieu de N requêtes
export async function validateCartItemsWithDb(input: {
	items: Array<{
		skuId: string;
		quantity: number;
	}>;
}): Promise<{
	success: boolean;
	error?: string;
	data?: Array<{
		skuId: string;
		isValid: boolean;
		error?: string;
		availableStock?: number;
	}>;
}> {
	try {
		// Single batch query for all SKUs
		const batchResults = await batchValidateSkusForMerge(input.items);

		const validationResults = input.items.map((item) => {
			const result = batchResults.get(item.skuId);

			if (!result) {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.SKU_NOT_FOUND,
					availableStock: 0,
				};
			}

			if (!result.isActive) {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.SKU_INACTIVE,
					availableStock: result.inventory,
				};
			}

			if (result.productStatus !== "PUBLIC") {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC,
					availableStock: result.inventory,
				};
			}

			if (result.inventory === 0) {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.OUT_OF_STOCK,
					availableStock: 0,
				};
			}

			if (result.inventory < item.quantity) {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(result.inventory),
					availableStock: result.inventory,
				};
			}

			return {
				skuId: item.skuId,
				isValid: true,
				availableStock: result.inventory,
			};
		});

		const hasErrors = validationResults.some((result) => !result.isValid);

		return {
			success: !hasErrors,
			error: hasErrors
				? CART_ERROR_MESSAGES.VALIDATION_FAILED
				: undefined,
			data: validationResults,
		};
	} catch (error) {
		return {
			success: false,
			error: CART_ERROR_MESSAGES.GENERAL_ERROR,
		};
	}
}

/**
 * Valide plusieurs SKUs en une seule requête DB (optimisé pour mergeCarts)
 * Retourne une Map pour un accès O(1) aux résultats
 */
export async function batchValidateSkusForMerge(
	items: Array<{ skuId: string; quantity: number }>
): Promise<Map<string, BatchSkuValidationResult>> {
	const skuIds = items.map((item) => item.skuId);
	const quantityMap = new Map(items.map((item) => [item.skuId, item.quantity]));

	const skus = await fetchSkusForBatchValidation(skuIds);

	const results = new Map<string, BatchSkuValidationResult>();

	for (const sku of skus) {
		const requestedQty = quantityMap.get(sku.id) || 0;
		// Verifier aussi les soft-deletes pour eviter d'ajouter des produits supprimes
		const isValid =
			!sku.deletedAt &&
			!sku.product.deletedAt &&
			sku.isActive &&
			sku.product.status === "PUBLIC" &&
			sku.inventory >= requestedQty;

		results.set(sku.id, {
			skuId: sku.id,
			isValid,
			inventory: sku.inventory,
			isActive: sku.isActive,
			productStatus: sku.product.status,
		});
	}

	return results;
}
