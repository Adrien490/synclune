"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	notFound,
	handleActionError,
	safeFormGet,
	safeFormGetJSON,
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
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Parser les données du formulaire
		const productId = safeFormGet(formData, "productId");
		const collectionIds: string[] = safeFormGetJSON<string[]>(formData, "collectionIds") ?? [];

		// 3. Validation avec Zod
		const validation = validateInput(updateProductCollectionsSchema, {
			productId,
			collectionIds,
		});
		if ("error" in validation) return validation.error;
		// 4. Vérifier que le produit existe.
		// `deletedAt: null` — `delete-product` purge délibérément les ProductCollection
		// d'un produit supprimé (elles fuient dans les selects collections, filtrés sur
		// status seul) : sans ce filtre, cette action les recréait.
		const product = await prisma.product.findUnique({
			where: { id: validation.data.productId, deletedAt: null },
			select: { id: true, title: true, slug: true },
		});

		if (!product) {
			return notFound("Produit");
		}

		// 5. Vérifier que toutes les collections existent
		if (validation.data.collectionIds.length > 0) {
			const existingCollections = await prisma.collection.findMany({
				where: { id: { in: validation.data.collectionIds } },
				select: { id: true },
			});

			if (existingCollections.length !== validation.data.collectionIds.length) {
				// `notFound()` accorde UNE ressource au singulier : le pluriel se construit
				// à la main, comme le font déjà les actions `orders/` pour leurs messages
				// hors gabarit.
				return {
					status: ActionStatus.NOT_FOUND,
					message: "Une ou plusieurs collections sont introuvables.",
				};
			}
		}

		// 6. Récupérer TOUTES les collections actuelles du produit (pour invalidation cache + rang)
		const currentCollections = await prisma.productCollection.findMany({
			where: {
				productId: validation.data.productId,
			},
			select: {
				collectionId: true,
				position: true,
				collection: {
					select: { slug: true },
				},
			},
		});

		// Conserver le rang existant pour les collections qui restent associées
		// (la vedette d'une collection est le rang 0 de (position asc, addedAt desc)
		// depuis le remplacement d'`isFeatured` — audit schéma V5, lot A3).
		const positionMap = new Map(currentCollections.map((pc) => [pc.collectionId, pc.position]));

		// 7. Mettre à jour les collections (transaction) : les associations
		// conservées gardent leur rang, les nouvelles s'ajoutent en fin de liste
		// de LEUR collection (max + 1) — jamais au rang 0, qui est éditorial.
		await prisma.$transaction(async (tx) => {
			await tx.productCollection.deleteMany({
				where: { productId: validation.data.productId },
			});
			for (const collectionId of validation.data.collectionIds) {
				const keptPosition = positionMap.get(collectionId);
				let position: number;
				if (keptPosition !== undefined) {
					position = keptPosition;
				} else {
					const last = await tx.productCollection.findFirst({
						where: { collectionId },
						orderBy: { position: "desc" },
						select: { position: true },
					});
					position = last === null ? 0 : last.position + 1;
				}
				await tx.productCollection.create({
					data: {
						productId: validation.data.productId,
						collectionId,
						position,
					},
				});
			}
		});

		// 8. Invalider le cache des anciennes collections
		for (const pc of currentCollections) {
			const tags = getCollectionInvalidationTags(pc.collection.slug);
			tags.forEach((tag) => updateTag(tag));
		}

		// 9. Invalider le cache des nouvelles collections
		if (validation.data.collectionIds.length > 0) {
			const newCollections = await prisma.collection.findMany({
				where: { id: { in: validation.data.collectionIds } },
				select: { slug: true },
			});
			for (const collection of newCollections) {
				const tags = getCollectionInvalidationTags(collection.slug);
				tags.forEach((tag) => updateTag(tag));
			}
		}

		// 10. Invalider le cache du produit
		const productTags = getProductInvalidationTags(product.slug, product.id);
		productTags.forEach((tag) => updateTag(tag));

		// 11. Audit log

		return success(
			validation.data.collectionIds.length > 0
				? `${product.title} ajouté à ${validation.data.collectionIds.length} collection(s)`
				: `${product.title} retiré de toutes les collections`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible de mettre à jour les collections du produit");
	}
}
