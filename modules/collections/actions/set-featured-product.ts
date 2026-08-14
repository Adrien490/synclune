"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { setFeaturedProductSchema } from "../schemas/collection.schemas";

/**
 * Server Action pour definir un produit comme "vedette" dans une collection
 *
 * Depuis le remplacement d'`isFeatured` par `position` (audit schéma V5, lot A3),
 * la vedette est le rang 0 de `(position asc, addedAt desc)` : « mettre en
 * vedette » = amener l'association au rang 0 et renuméroter les autres en
 * préservant leur ordre relatif. Plus d'index unique partiel à protéger, donc
 * plus de transaction SERIALIZABLE. Il n'y a plus non plus d'état « aucune
 * vedette » : un rang 0 existe toujours (l'ex-`removeFeaturedProduct` est
 * parti avec le booléen).
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
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Ce produit n'appartient pas à cette collection.",
			};
		}

		// 3.1 Un produit vedette doit être visible sur le storefront (garde serveur :
		// l'UI admin ne liste que les produits PUBLIC, mais l'action reste appelable
		// directement — un vedette soft-deleted/non-PUBLIC casserait le hero collection)
		if (productCollection.product.deletedAt || productCollection.product.status !== "PUBLIC") {
			return error(
				"Seul un produit publié (et non supprimé) peut être mis en avant dans une collection.",
			);
		}

		// 4. Renumérotation : la cible prend le rang 0, les autres associations
		// suivent dans leur ordre canonique actuel (position asc, addedAt desc).
		// Quelques dizaines de lignes au plus — la boucle d'updates est négligeable.
		await prisma.$transaction(async (tx) => {
			const siblings = await tx.productCollection.findMany({
				where: { collectionId, NOT: { productId } },
				orderBy: [{ position: "asc" }, { addedAt: "desc" }],
				select: { productId: true },
			});
			await tx.productCollection.update({
				where: { productId_collectionId: { productId, collectionId } },
				data: { position: 0 },
			});
			for (const [index, sibling] of siblings.entries()) {
				await tx.productCollection.update({
					where: {
						productId_collectionId: { productId: sibling.productId, collectionId },
					},
					data: { position: index + 1 },
				});
			}
		});

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
