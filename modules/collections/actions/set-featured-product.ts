"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";
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
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

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

		// 4. Transaction: retirer l'ancien featured et definir le nouveau
		await prisma.$transaction([
			// Retirer le featured actuel de la collection
			prisma.productCollection.updateMany({
				where: {
					collectionId,
					isFeatured: true,
				},
				data: {
					isFeatured: false,
				},
			}),
			// Definir le nouveau produit featured
			prisma.productCollection.update({
				where: {
					productId_collectionId: {
						productId,
						collectionId,
					},
				},
				data: {
					isFeatured: true,
				},
			}),
		]);

		// 5. Invalider le cache de la collection
		const collectionTags = getCollectionInvalidationTags(
			productCollection.collection.slug
		);
		collectionTags.forEach((tag) => updateTag(tag));

		return success(`"${productCollection.product.title}" est maintenant le produit vedette de "${productCollection.collection.name}".`);
	} catch (e) {
		return handleActionError(e, "Impossible de définir le produit vedette");
	}
}

/**
 * Server Action pour retirer le statut "vedette" d'un produit dans une collection
 */
export async function removeFeaturedProduct(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

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
		const collectionTags = getCollectionInvalidationTags(
			productCollection.collection.slug
		);
		collectionTags.forEach((tag) => updateTag(tag));

		return success(`"${productCollection.product.title}" n'est plus le produit vedette de "${productCollection.collection.name}".`);
	} catch (e) {
		return handleActionError(e, "Impossible de retirer le produit vedette");
	}
}
