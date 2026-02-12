"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, error, notFound, validationError, handleActionError } from "@/shared/lib/actions";
import { bulkDeleteProductsSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_BULK_DELETE_LIMIT } from "@/shared/lib/rate-limit-config";

/**
 * Server Action pour soft-delete plusieurs produits
 * Les SKUs sont soft-deleted en cascade.
 * Les fichiers UploadThing sont preserves jusqu'au hard delete (retention legale).
 * Compatible avec useActionState de React 19
 */
export async function bulkDeleteProducts(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_BULK_DELETE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		const productIdsRaw = formData.get("productIds") as string;
		let productIds: string[] = [];

		try {
			productIds = JSON.parse(productIdsRaw);
		} catch {
			return validationError("Format de donnees invalide.");
		}

		// Validation defensive : verifier que productIds est bien un tableau
		if (!Array.isArray(productIds)) {
			return validationError("La liste des produits est invalide.");
		}

		const rawData = {
			productIds,
		};

		// 3. Validation avec Zod
		const validation = validateInput(bulkDeleteProductsSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productIds: validatedProductIds } = validation.data;

		// 4. Verifier que tous les produits existent et recuperer leurs infos
		const existingProducts = await prisma.product.findMany({
			where: {
				id: {
					in: validatedProductIds,
				},
			},
			select: {
				id: true,
				title: true,
				slug: true,
				collections: {
					select: {
						collection: {
							select: { slug: true },
						},
					},
				},
			},
		});

		if (existingProducts.length !== validatedProductIds.length) {
			return notFound("Certains produits");
		}

		// 5. Verifier si les produits ont des commandes associees
		const orderItemsCount = await prisma.orderItem.count({
			where: {
				sku: {
					productId: {
						in: validatedProductIds,
					},
				},
			},
		});

		if (orderItemsCount > 0) {
			return error(
				`Les produits selectionnes ne peuvent pas etre supprimes car ils sont associes a ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
				"Pour conserver l'historique des commandes, veuillez archiver les produits a la place."
			);
		}

		// 6. Find affected carts before deletion (for cache invalidation)
		const affectedCarts = await prisma.cartItem.findMany({
			where: { sku: { productId: { in: validatedProductIds } } },
			select: { cart: { select: { userId: true, sessionId: true } } },
			distinct: ["cartId"],
		});

		// 7. Soft delete les produits et leurs SKUs dans une transaction
		// Also clean up CartItems referencing these products' SKUs
		// Files are preserved on UploadThing until hard delete (10-year retention)
		await prisma.$transaction(async (tx) => {
			// Remove CartItems referencing these products' SKUs before soft-deleting
			await tx.cartItem.deleteMany({
				where: { sku: { productId: { in: validatedProductIds } } },
			});

			const now = new Date();
			await tx.productSku.updateMany({
				where: { productId: { in: validatedProductIds } },
				data: { deletedAt: now },
			});
			await tx.product.updateMany({
				where: { id: { in: validatedProductIds } },
				data: { deletedAt: now },
			});
		});

		// 8. Invalidate cart caches for affected users
		for (const { cart } of affectedCarts) {
			const cartTags = getCartInvalidationTags(cart.userId ?? undefined, cart.sessionId ?? undefined);
			cartTags.forEach(tag => updateTag(tag));
		}

		// 9. Invalidate cache tags pour tous les produits supprimes
		for (const product of existingProducts) {
			const productTags = getProductInvalidationTags(product.slug, product.id);
			productTags.forEach(tag => updateTag(tag));

			// Si le produit appartenait a des collections, invalider aussi leurs caches
			for (const pc of product.collections) {
				const collectionTags = getCollectionInvalidationTags(
					pc.collection.slug
				);
				collectionTags.forEach(tag => updateTag(tag));
			}
		}

		// 10. Success
		return success(
			`${existingProducts.length} produit${existingProducts.length > 1 ? "s" : ""} supprimé${existingProducts.length > 1 ? "s" : ""} avec succès.`,
			{
				deletedCount: existingProducts.length,
				productIds: validatedProductIds,
			}
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression des produits");
	}
}
