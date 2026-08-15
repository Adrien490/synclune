"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
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
import { deleteProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { getVariantInvalidationTags } from "@/modules/variants/utils/cache.utils";
import { deleteUnreferencedCatalogMedia } from "@/modules/media/services/delete-unreferenced-catalog-media.service";

/**
 * Server Action pour supprimer un produit — schéma lean (lot 2) : suppression
 * RÉELLE (plus de soft delete). Les OrderItem existants gardent leurs snapshots
 * (`onDelete: SetNull` sur productId/variantId) ; variantes et médias partent
 * en cascade. Le panier/favoris en cookie deviennent inertes d'eux-mêmes.
 * Désactiver (`active: false`) reste le chemin réversible.
 */
export async function deleteProduct(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction + validation
		const rawData = { productId: safeFormGet(formData, "productId") };
		const validation = validateInput(deleteProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId } = validation.data;

		// 3. Produit + données d'invalidation
		const existingProduct = await prisma.product.findUnique({
			where: { id: productId },
			select: {
				id: true,
				name: true,
				slug: true,
				collections: { select: { slug: true } },
				variants: { select: { id: true, colorId: true, materialId: true } },
				media: { select: { url: true } },
			},
		});

		if (!existingProduct) {
			return notFound("Produit");
		}

		// 4. Suppression réelle (cascade variantes + médias, SetNull OrderItem)
		await prisma.product.delete({ where: { id: productId } });

		// 5. Purge UploadThing (la SSOT préserve les URLs encore référencées par
		// un autre produit — blobs partagés par duplication)
		const mediaUrls = existingProduct.media.map((m) => m.url);
		if (mediaUrls.length > 0) {
			after(() => deleteUnreferencedCatalogMedia(mediaUrls, { action: "deleteProduct" }));
		}

		// 6. Invalidation de cache
		getProductInvalidationTags(existingProduct.slug, existingProduct.id).forEach((tag) =>
			updateTag(tag),
		);
		getVariantInvalidationTags({
			productId: existingProduct.id,
			productSlug: existingProduct.slug,
			colorIds: existingProduct.variants.map((v) => v.colorId),
			materialIds: existingProduct.variants.map((v) => v.materialId),
		}).forEach((tag) => updateTag(tag));
		for (const c of existingProduct.collections) {
			getCollectionInvalidationTags(c.slug).forEach((tag) => updateTag(tag));
		}

		// 7. Succès
		return success(`Bijou « ${existingProduct.name} » supprimé de l'atelier`);
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer le produit");
	}
}
