"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	notFound,
	handleActionError,
	safeFormGet,
	safeFormGetJSON,
	BusinessError,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { updateProductCollectionsSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour mettre à jour les collections d'un produit —
 * schéma lean (lot 2) : M-N implicite Prisma (`set`), plus de position/vedette.
 */
export async function updateProductCollections(
	prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Parse + validation
		const productId = safeFormGet(formData, "productId");
		const collectionIds: string[] = safeFormGetJSON<string[]>(formData, "collectionIds") ?? [];
		const validation = validateInput(updateProductCollectionsSchema, {
			productId,
			collectionIds,
		});
		if ("error" in validation) return validation.error;

		// 3. Produit + anciennes collections (pour l'invalidation)
		const product = await prisma.product.findUnique({
			where: { id: validation.data.productId },
			select: {
				id: true,
				name: true,
				slug: true,
				collections: { select: { slug: true } },
			},
		});
		if (!product) return notFound("Produit");

		// 4. Resynchronisation en transaction (existence vérifiée dedans)
		const newCollectionSlugs = await prisma.$transaction(async (tx) => {
			let slugs: string[] = [];
			if (validation.data.collectionIds.length > 0) {
				const collections = await tx.collection.findMany({
					where: { id: { in: validation.data.collectionIds } },
					select: { id: true, slug: true },
				});
				if (collections.length !== validation.data.collectionIds.length) {
					throw new BusinessError("Une ou plusieurs collections spécifiées n'existent pas.");
				}
				slugs = collections.map((c) => c.slug);
			}
			await tx.product.update({
				where: { id: validation.data.productId },
				data: {
					collections: { set: validation.data.collectionIds.map((id) => ({ id })) },
				},
			});
			return slugs;
		});

		// 5. Invalidation (anciennes + nouvelles collections + produit)
		getProductInvalidationTags(product.slug, product.id).forEach((tag) => updateTag(tag));
		for (const slug of new Set([
			...product.collections.map((c) => c.slug),
			...newCollectionSlugs,
		])) {
			getCollectionInvalidationTags(slug).forEach((tag) => updateTag(tag));
		}

		// 6. Succès
		return success(`Collections de « ${product.name} » mises à jour`);
	} catch (e) {
		return handleActionError(e, "Impossible de mettre à jour les collections");
	}
}
