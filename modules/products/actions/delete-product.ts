"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	error,
	notFound,
	handleActionError,
	safeFormGet,
} from "@/shared/lib/actions";
import { deleteProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
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
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdminWithUser();
		if ("error" in admin) return admin.error;

		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_DELETE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		const rawData = {
			productId: safeFormGet(formData, "productId"),
		};

		// 3. Validation avec Zod
		const validation = validateInput(deleteProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId } = validation.data;

		// 4. Verifier que le produit existe.
		// `deletedAt: null` — re-supprimer un produit déjà soft-deleted re-purgerait
		// paniers/favoris/collections pour rien et rendrait un faux succès.
		const existingProduct = await prisma.product.findUnique({
			where: { id: productId, deletedAt: null },
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
				// Cascade cache : la suppression emporte les SKUs, donc le KPI
				// « produits distincts » de leurs couleurs et matériaux.
				skus: {
					select: {
						colors: { select: { colorId: true } },
						materials: { select: { materialId: true } },
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
				`Ce produit ne peut pas être supprimé car il est associé à ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
					"Pour conserver l'historique des commandes, veuillez archiver le produit à la place.",
			);
		}

		// 6. Find affected carts and wishlists before deletion (for cache invalidation)
		const affectedCarts = await prisma.cartItem.findMany({
			where: { sku: { productId } },
			select: { cart: { select: { userId: true, sessionId: true } } },
			distinct: ["cartId"],
		});
		const affectedWishlists = await prisma.wishlistItem.findMany({
			where: { productId },
			select: { wishlist: { select: { userId: true, sessionId: true } } },
			distinct: ["wishlistId"],
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

			// Remove collection memberships — pas de restore-product : les lignes
			// ProductCollection d'un produit soft-deleted ne servent plus qu'à fuir
			// dans les selects collections (filtrés sur status seul).
			await tx.productCollection.deleteMany({
				where: { productId },
			});

			const now = new Date();
			await tx.productSku.updateMany({
				where: { productId },
				data: { deletedAt: now },
			});
			await tx.product.update({
				where: { id: productId },
				data: { deletedAt: now, status: "ARCHIVED" },
			});
		});

		// 8. Invalidate cart and wishlist caches for affected users
		// (effet limité aux caches `private` du client courant — la fenêtre de
		// staleness des autres clients est bornée par le profil `checkout`)
		for (const { cart } of affectedCarts) {
			const cartTags = getCartInvalidationTags(
				cart.userId ?? undefined,
				cart.sessionId ?? undefined,
			);
			cartTags.forEach((tag) => updateTag(tag));
		}
		for (const { wishlist } of affectedWishlists) {
			const wishlistTags = getWishlistInvalidationTags(
				wishlist.userId ?? undefined,
				wishlist.sessionId ?? undefined,
			);
			wishlistTags.forEach((tag) => updateTag(tag));
		}

		// 9. Invalidate cache tags (invalidation ciblee au lieu de revalidatePath global)
		const productTags = getProductInvalidationTags(existingProduct.slug, existingProduct.id, {
			affectedColorIds: existingProduct.skus.flatMap((sku) => sku.colors.map((c) => c.colorId)),
			affectedMaterialIds: existingProduct.skus.flatMap((sku) =>
				sku.materials.map((m) => m.materialId),
			),
		});
		productTags.forEach((tag) => updateTag(tag));

		// Si le produit appartenait a des collections, invalider aussi leurs caches
		for (const pc of existingProduct.collections) {
			const collectionTags = getCollectionInvalidationTags(pc.collection.slug);
			collectionTags.forEach((tag) => updateTag(tag));
		}

		// 10. Audit log

		// 11. Success
		return success(`Produit "${existingProduct.title}" supprimé avec succès.`, {
			productId,
			title: existingProduct.title,
			slug: existingProduct.slug,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression du produit");
	}
}
