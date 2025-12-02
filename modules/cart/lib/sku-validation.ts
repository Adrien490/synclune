"use server";

import { prisma } from "@/shared/lib/prisma";
import { z } from "zod";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";

// Types pour la validation SKU
export interface SkuData {
	id: string;
	sku: string;
	priceInclTax: number;
	compareAtPrice: number | null; // Prix barré (null si pas en solde)
	inventory: number;
	isActive: boolean;
	material?: string;
	colorId?: string;
	color?: {
		id: string;
		name: string;
		hex: string;
	};
	size?: string;
	product: {
		id: string;
		title: string;
		slug: string;
		description?: string | null;
	};
	images: Array<{
		url: string;
		altText?: string;
		isPrimary: boolean;
	}>;
}

export interface SkuValidationResult {
	success: boolean;
	error?: string;
	data?: {
		sku: SkuData;
	};
}

export interface SkuDetailsResult {
	success: boolean;
	error?: string;
	data?: {
		sku: SkuData;
	};
}

// Schéma de validation
const validateSkuSchema = z.object({
	skuId: z.string().min(1, CART_ERROR_MESSAGES.SKU_NOT_FOUND),
	quantity: z
		.number()
		.int()
		.min(1, CART_ERROR_MESSAGES.QUANTITY_MIN)
		.max(99, CART_ERROR_MESSAGES.QUANTITY_MAX),
});

const getSkuDetailsSchema = z.object({
	skuId: z.string().min(1, CART_ERROR_MESSAGES.SKU_NOT_FOUND),
});

// Action: Valider un SKU et son stock
export async function validateSkuAndStock(input: {
	skuId: string;
	quantity: number;
}): Promise<SkuValidationResult> {
	try {
		// Validation des inputs
		const validatedInput = validateSkuSchema.parse(input);

		// Récupérer le SKU avec ses relations
		const sku = await prisma.productSku.findUnique({
			where: { id: validatedInput.skuId },
			include: {
				product: {
					select: {
						id: true,
						title: true,
						slug: true,
						status: true,
						description: true,
					},
				},
				images: {
					orderBy: { createdAt: "asc" },
				},
				color: {
					select: {
						id: true,
						name: true,
						hex: true,
					},
				},
				material: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!sku) {
			return {
				success: false,
				error: CART_ERROR_MESSAGES.SKU_NOT_FOUND,
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

		// Récupérer le SKU avec toutes ses relations
		const sku = await prisma.productSku.findUnique({
			where: { id: validatedInput.skuId },
			include: {
				product: true,
				images: {
					orderBy: { createdAt: "asc" },
				},
				color: {
					select: {
						id: true,
						name: true,
						hex: true,
					},
				},
				material: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

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
export async function validateCartItems(input: {
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

// Type pour le résultat de validation batch
export interface BatchSkuValidationResult {
	skuId: string;
	isValid: boolean;
	inventory: number;
	isActive: boolean;
	productStatus: string;
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

	// Une seule requête pour tous les SKUs
	const skus = await prisma.productSku.findMany({
		where: { id: { in: skuIds } },
		select: {
			id: true,
			inventory: true,
			isActive: true,
			product: {
				select: {
					status: true,
				},
			},
		},
	});

	const results = new Map<string, BatchSkuValidationResult>();

	for (const sku of skus) {
		const requestedQty = quantityMap.get(sku.id) || 0;
		const isValid =
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
