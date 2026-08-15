"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { deleteCollectionSchema } from "../schemas/collection.schemas";

export async function deleteCollection(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extract and validate data
		const validated = validateInput(deleteCollectionSchema, {
			id: formData.get("id"),
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Verifier que la collection existe + compter les produits lies (M-N
		// implicite : les lignes de jointure sont purgees automatiquement au
		// delete, les produits eux-memes sont preserves).
		const existingCollection = await prisma.collection.findUnique({
			where: { id: validatedData.id },
			include: {
				_count: { select: { products: true } },
			},
		});

		if (!existingCollection) {
			return error("Cette collection n'existe pas");
		}

		const productCount = existingCollection._count.products;

		// Supprimer la collection
		await prisma.collection.delete({
			where: { id: validatedData.id },
		});

		// Invalider le cache
		getCollectionInvalidationTags(existingCollection.slug).forEach((tag) => updateTag(tag));

		// Message different selon si la collection avait des produits
		const message =
			productCount > 0
				? `Collection supprimée avec succès. ${productCount} produit${productCount > 1 ? "s ont" : " a"} été préservé${productCount > 1 ? "s" : ""}.`
				: "Collection supprimée avec succès";

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de la collection");
	}
}
