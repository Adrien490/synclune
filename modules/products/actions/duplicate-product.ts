"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	notFound,
	handleActionError,
	safeFormGet,
} from "@/shared/lib/actions";
import { generateSlug } from "@/shared/utils/generate-slug";
import { duplicateProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { getProductForDuplication } from "../data/get-product-for-duplication";

/**
 * Server Action pour dupliquer un produit — schéma lean (lot 2).
 * Copie produit + variantes + médias (les blobs UploadThing sont PARTAGÉS —
 * la purge à la suppression passe par la SSOT qui recoupe les références).
 * La copie naît toujours INACTIVE.
 */
export async function duplicateProduct(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation
		const rawData = { productId: safeFormGet(formData, "productId") };
		const validation = validateInput(duplicateProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId } = validation.data;

		// 3. Produit source (via data/ — select SSOT dans constants/)
		const sourceProduct = await getProductForDuplication(productId);

		if (!sourceProduct) {
			return notFound("Produit source");
		}

		// 4. Duplication en transaction
		const newName = `Copie de ${sourceProduct.name}`;

		const duplicatedProduct = await prisma.$transaction(async (tx) => {
			const newSlug = await generateSlug(tx, "product", newName);

			return tx.product.create({
				data: {
					name: newName,
					slug: newSlug,
					description: sourceProduct.description,
					priceCents: sourceProduct.priceCents,
					active: false,
					typeId: sourceProduct.typeId,
					collections: {
						connect: sourceProduct.collections.map((c) => ({ id: c.id })),
					},
					media: {
						create: sourceProduct.media.map((m) => ({
							url: m.url,
							alt: m.alt,
							type: m.type,
							position: m.position,
						})),
					},
					variants: {
						create: sourceProduct.variants.map((v) => ({
							size: v.size,
							colorId: v.colorId,
							materialId: v.materialId,
							priceCents: v.priceCents,
							stock: v.stock,
							active: v.active,
						})),
					},
				},
				select: { id: true, name: true, slug: true },
			});
		});

		// 5. Invalidation de cache
		getProductInvalidationTags(duplicatedProduct.slug, duplicatedProduct.id).forEach((tag) =>
			updateTag(tag),
		);
		for (const c of sourceProduct.collections) {
			getCollectionInvalidationTags(c.slug).forEach((tag) => updateTag(tag));
		}

		// 6. Succès
		return success(`Bijou dupliqué : « ${duplicatedProduct.name} » (brouillon)`, {
			productId: duplicatedProduct.id,
			slug: duplicatedProduct.slug,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer le produit");
	}
}
