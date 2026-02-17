"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, error, notFound, handleActionError } from "@/shared/lib/actions";
import { deleteProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_DELETE_LIMIT } from "@/shared/lib/rate-limit-config";

/**
 * Server Action pour soft-delete un produit
 * Les SKUs sont soft-deleted en cascade.
 * Les fichiers UploadThing sont preserves jusqu'au hard delete (retention legale).
 * Compatible avec useActionState de React 19
 */
export async function deleteProduct(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_DELETE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		const rawData = {
			productId: formData.get("productId") as string,
		};

		// 3. Validation avec Zod
		const validation = validateInput(deleteProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId } = validation.data;

		// 4. Verifier que le produit existe
		const existingProduct = await prisma.product.findUnique({
			where: { id: productId },
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

		if (!existingProduct) {
			return notFound("Le produit");
		}

		// 5. Verifier si le produit a des commandes associees
		// Les OrderItems sont lies aux SKUs, donc verifier via les SKUs du produit
		const orderItemsCount = await prisma.orderItem.count({
			where: {
				sku: {
					productId,
				},
			},
		});

		if (orderItemsCount > 0) {
			return error(
				`Ce produit ne peut pas etre supprime car il est associe a ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
				"Pour conserver l'historique des commandes, veuillez archiver le produit a la place."
			);
		}

		// 6. Find affected carts before deletion (for cache invalidation)
		const affectedCarts = await prisma.cartItem.findMany({
			where: { sku: { productId } },
			select: { cart: { select: { userId: true, sessionId: true } } },
			distinct: ["cartId"],
		});

		// 7. Soft delete le produit et ses SKUs dans une transaction
		// Also clean up CartItems and WishlistItems referencing this product's SKUs
		// Files are preserved on UploadThing until hard delete (10-year retention)
		await prisma.$transaction(async (tx) => {
			// Remove CartItems referencing this product's SKUs before soft-deleting
			await tx.cartItem.deleteMany({
				where: { sku: { productId } },
			});

			// Remove WishlistItems referencing this product
			await tx.wishlistItem.deleteMany({
				where: { productId },
			});

			const now = new Date();
			await tx.productSku.updateMany({
				where: { productId },
				data: { deletedAt: now },
			});
			await tx.product.update({
				where: { id: productId },
				data: { deletedAt: now },
			});
		});

		// 8. Invalidate cart caches for affected users
		for (const { cart } of affectedCarts) {
			const cartTags = getCartInvalidationTags(cart.userId ?? undefined, cart.sessionId ?? undefined);
			cartTags.forEach(tag => updateTag(tag));
		}

		// 9. Invalidate cache tags (invalidation ciblee au lieu de revalidatePath global)
		const productTags = getProductInvalidationTags(
			existingProduct.slug,
			existingProduct.id
		);
		productTags.forEach(tag => updateTag(tag));

		// Si le produit appartenait a des collections, invalider aussi leurs caches
		for (const pc of existingProduct.collections) {
			const collectionTags = getCollectionInvalidationTags(
				pc.collection.slug
			);
			collectionTags.forEach(tag => updateTag(tag));
		}

		// 10. Success
		return success(`Produit "${existingProduct.title}" supprimé avec succès.`, {
			productId,
			title: existingProduct.title,
			slug: existingProduct.slug,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression du produit");
	}
}
