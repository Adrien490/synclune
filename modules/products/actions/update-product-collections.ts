"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { updateProductCollectionsSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT } from "@/shared/lib/rate-limit-config";

/**
 * Server Action ADMIN pour mettre à jour les collections d'un produit
 *
 * @param prevState - État précédent de l'action (pour useActionState)
 * @param formData - FormData contenant productId et collectionIds (JSON)
 */
export async function updateProductCollections(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	// 1. Vérification admin
	const adminCheck = await requireAdmin();
	if ("error" in adminCheck) return adminCheck.error;

	// 1.1 Rate limiting
	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT);
	if ("error" in rateLimit) return rateLimit.error;

	// 2. Parser les données du formulaire
	const productId = formData.get("productId") as string;
	const collectionIdsRaw = formData.get("collectionIds") as string;

	let collectionIds: string[] = [];
	try {
		collectionIds = collectionIdsRaw ? JSON.parse(collectionIdsRaw) : [];
	} catch {
		collectionIds = [];
	}

	// 3. Validation avec Zod
	const validation = validateInput(updateProductCollectionsSchema, {
		productId,
		collectionIds,
	});
	if ("error" in validation) return validation.error;

	try {
		// 4. Vérifier que le produit existe
		const product = await prisma.product.findUnique({
			where: { id: validation.data.productId },
			select: { id: true, title: true, slug: true },
		});

		if (!product) {
			return notFound("Produit non trouvé");
		}

		// 5. Vérifier que toutes les collections existent
		if (validation.data.collectionIds.length > 0) {
			const existingCollections = await prisma.collection.findMany({
				where: { id: { in: validation.data.collectionIds } },
				select: { id: true },
			});

			if (existingCollections.length !== validation.data.collectionIds.length) {
				return notFound("Une ou plusieurs collections n'existent pas");
			}
		}

		// 6. Récupérer les collections où ce produit était featured (pour invalidation cache)
		const featuredInCollections = await prisma.productCollection.findMany({
			where: {
				productId: validation.data.productId,
				isFeatured: true,
			},
			select: {
				collection: {
					select: { slug: true },
				},
			},
		});

		// 7. Mettre à jour les collections (transaction)
		await prisma.$transaction([
			// Supprimer les associations existantes
			prisma.productCollection.deleteMany({
				where: { productId: validation.data.productId },
			}),
			// Créer les nouvelles associations
			...(validation.data.collectionIds.length > 0
				? [
						prisma.productCollection.createMany({
							data: validation.data.collectionIds.map((collectionId) => ({
								productId: validation.data.productId,
								collectionId,
							})),
						}),
				  ]
				: []),
		]);

		// 8. Invalider le cache des collections où le produit était featured
		for (const pc of featuredInCollections) {
			const tags = getCollectionInvalidationTags(pc.collection.slug);
			tags.forEach((tag) => updateTag(tag));
		}

		// 9. Invalider le cache du produit
		const productTags = getProductInvalidationTags(product.slug, product.id);
		productTags.forEach((tag) => updateTag(tag));

		return success(
			validation.data.collectionIds.length > 0
				? `${product.title} ajouté à ${validation.data.collectionIds.length} collection(s)`
				: `${product.title} retiré de toutes les collections`
		);
	} catch (e) {
		return handleActionError(
			e,
			"Impossible de mettre à jour les collections du produit"
		);
	}
}
