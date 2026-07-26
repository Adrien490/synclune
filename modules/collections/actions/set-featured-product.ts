"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validateInput, handleActionError, success, notFound, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { setFeaturedProductSchema } from "../schemas/collection.schemas";

/**
 * Server Action pour definir un produit comme "vedette" dans une collection
 * Un seul produit peut etre featured par collection
 */
export async function setFeaturedProduct(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Validate data
		const validated = validateInput(setFeaturedProductSchema, {
			collectionId: formData.get("collectionId"),
			productId: formData.get("productId"),
		});
		if ("error" in validated) return validated.error;

		const { collectionId, productId } = validated.data;

		// 3. Verifier que l'association ProductCollection existe
		const productCollection = await prisma.productCollection.findUnique({
			where: {
				productId_collectionId: {
					productId,
					collectionId,
				},
			},
			include: {
				collection: {
					select: { slug: true, name: true },
				},
				product: {
					select: { title: true, status: true, deletedAt: true },
				},
			},
		});

		if (!productCollection) {
			return notFound("Produit dans cette collection");
		}

		// 3.1 Un produit vedette doit être visible sur le storefront (garde serveur :
		// l'UI admin ne liste que les produits PUBLIC, mais l'action reste appelable
		// directement — un vedette soft-deleted/non-PUBLIC casserait le hero collection)
		if (productCollection.product.deletedAt || productCollection.product.status !== "PUBLIC") {
			return error(
				"Seul un produit publié (et non supprimé) peut être mis en avant dans une collection.",
			);
		}

		// 4. Transaction interactive Serializable: deux admins concurrents sur la
		// meme collection mais produits differents pourraient sinon violer la
		// contrainte unique partielle (WHERE isFeatured = true). Serializable garantit
		// l'atomicite read-modify-write sur les rows ProductCollection lus.
		await prisma.$transaction(
			async (tx) => {
				await tx.productCollection.updateMany({
					where: { collectionId, isFeatured: true },
					data: { isFeatured: false },
				});
				await tx.productCollection.update({
					where: { productId_collectionId: { productId, collectionId } },
					data: { isFeatured: true },
				});
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);

		// 5. Invalider le cache de la collection
		const collectionTags = getCollectionInvalidationTags(productCollection.collection.slug);
		collectionTags.forEach((tag) => updateTag(tag));

		return success(
			`"${productCollection.product.title}" est maintenant le produit vedette de "${productCollection.collection.name}".`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible de définir le produit vedette");
	}
}

/**
 * Server Action pour retirer le statut "vedette" d'un produit dans une collection
 */
export async function removeFeaturedProduct(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Validate data
		const validated = validateInput(setFeaturedProductSchema, {
			collectionId: formData.get("collectionId"),
			productId: formData.get("productId"),
		});
		if ("error" in validated) return validated.error;

		const { collectionId, productId } = validated.data;

		// 3. Verifier que l'association ProductCollection existe
		const productCollection = await prisma.productCollection.findUnique({
			where: {
				productId_collectionId: {
					productId,
					collectionId,
				},
			},
			include: {
				collection: {
					select: { slug: true, name: true },
				},
				product: {
					select: { title: true },
				},
			},
		});

		if (!productCollection) {
			return notFound("Produit dans cette collection");
		}

		// 4. Retirer le statut featured
		await prisma.productCollection.update({
			where: {
				productId_collectionId: {
					productId,
					collectionId,
				},
			},
			data: {
				isFeatured: false,
			},
		});

		// 5. Invalider le cache de la collection
		const collectionTags = getCollectionInvalidationTags(productCollection.collection.slug);
		collectionTags.forEach((tag) => updateTag(tag));

		return success(
			`"${productCollection.product.title}" n'est plus le produit vedette de "${productCollection.collection.name}".`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible de retirer le produit vedette");
	}
}
