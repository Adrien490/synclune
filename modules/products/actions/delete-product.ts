"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, error, notFound, handleActionError } from "@/shared/lib/actions";
import { deleteProductSchema } from "../schemas/product.schemas";
import { UTApi } from "uploadthing/server";
import { getProductInvalidationTags } from "../constants/cache";

/**
 * Extrait la cle du fichier depuis une URL UploadThing
 */
function extractFileKeyFromUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		const parts = urlObj.pathname.split("/");
		return parts[parts.length - 1];
	} catch {
		return url;
	}
}

/**
 * Supprime des fichiers UploadThing de maniere securisee
 * Instancie UTApi par requete pour eviter le partage de tokens entre workers
 */
async function deleteUploadThingFiles(urls: string[]): Promise<void> {
	if (urls.length === 0) return;
	try {
		const utapi = new UTApi();
		const fileKeys = urls.map(extractFileKeyFromUrl);
		await utapi.deleteFiles(fileKeys);
	} catch {
		// Ignore - ne bloque pas la suppression du produit
	}
}

/**
 * Server Action pour supprimer un produit
 * Supprime egalement :
 * - Tous les SKUs (cascade Prisma)
 * - Toutes les images des SKUs (fichiers UploadThing + entrees DB)
 * Compatible avec useActionState de React 19
 */
export async function deleteProduct(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des donnees du FormData
		const rawData = {
			productId: formData.get("productId") as string,
		};

		// 3. Validation avec Zod
		const validation = validateInput(deleteProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId } = validation.data;

		// 4. Verifier que le produit existe et recuperer toutes les images des SKUs
		const existingProduct = await prisma.product.findUnique({
			where: { id: productId },
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
				skus: {
					select: {
						id: true,
						sku: true,
						images: {
							select: {
								url: true,
							},
						},
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
				`Ce produit ne peut pas etre supprime car il est associe a ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
				"Pour conserver l'historique des commandes, veuillez archiver le produit a la place."
			);
		}

		// 6. Supprimer tous les fichiers UploadThing de toutes les variantes
		const allImageUrls = existingProduct.skus.flatMap((sku) =>
			sku.images.map((img) => img.url)
		);
		await deleteUploadThingFiles(allImageUrls);

		// 7. Soft delete le produit et ses SKUs dans une transaction
		await prisma.$transaction(async (tx) => {
			const now = new Date();
			await tx.productSku.updateMany({
				where: { productId },
				data: { deletedAt: now },
			});
			await tx.product.update({
				where: { id: productId },
				data: { deletedAt: now },
			});
		});

		// 8. Invalidate cache tags (invalidation ciblee au lieu de revalidatePath global)
		const productTags = getProductInvalidationTags(
			existingProduct.slug,
			existingProduct.id
		);
		productTags.forEach(tag => updateTag(tag));

		// Si le produit appartenait a des collections, invalider aussi leurs caches
		for (const pc of existingProduct.collections) {
			const collectionTags = getCollectionInvalidationTags(
				pc.collection.slug
			);
			collectionTags.forEach(tag => updateTag(tag));
		}

		// 9. Success
		return success(`Produit "${existingProduct.title}" supprimé avec succès.`, {
			productId,
			title: existingProduct.title,
			slug: existingProduct.slug,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression du produit");
	}
}
