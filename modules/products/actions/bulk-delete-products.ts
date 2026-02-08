"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, error, notFound, validationError, handleActionError } from "@/shared/lib/actions";
import { UTApi } from "uploadthing/server";
import { bulkDeleteProductsSchema } from "../schemas/product.schemas";
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
		// Ignore - ne bloque pas la suppression des produits
	}
}

/**
 * Server Action pour supprimer plusieurs produits
 * Supprime egalement :
 * - Tous les SKUs (cascade Prisma)
 * - Toutes les images des SKUs (fichiers UploadThing + entrees DB)
 * Compatible avec useActionState de React 19
 */
export async function bulkDeleteProducts(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des donnees du FormData
		const productIdsRaw = formData.get("productIds") as string;
		let productIds: string[] = [];

		try {
			productIds = JSON.parse(productIdsRaw);
		} catch {
			return validationError("Format de donnees invalide.");
		}

		// Validation defensive : verifier que productIds est bien un tableau
		if (!Array.isArray(productIds)) {
			return validationError("La liste des produits est invalide.");
		}

		const rawData = {
			productIds,
		};

		// 3. Validation avec Zod
		const validation = validateInput(bulkDeleteProductsSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productIds: validatedProductIds } = validation.data;

		// 4. Verifier que tous les produits existent et recuperer leurs infos
		const existingProducts = await prisma.product.findMany({
			where: {
				id: {
					in: validatedProductIds,
				},
			},
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

		if (existingProducts.length !== validatedProductIds.length) {
			return notFound("Certains produits");
		}

		// 5. Verifier si les produits ont des commandes associees
		const orderItemsCount = await prisma.orderItem.count({
			where: {
				sku: {
					productId: {
						in: validatedProductIds,
					},
				},
			},
		});

		if (orderItemsCount > 0) {
			return error(
				`Les produits selectionnes ne peuvent pas etre supprimes car ils sont associes a ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
				"Pour conserver l'historique des commandes, veuillez archiver les produits a la place."
			);
		}

		// 6. Supprimer tous les fichiers UploadThing de tous les produits
		const allImageUrls = existingProducts.flatMap((product) =>
			product.skus.flatMap((sku) => sku.images.map((img) => img.url))
		);
		await deleteUploadThingFiles(allImageUrls);

		// 7. Soft delete les produits et leurs SKUs dans une transaction
		await prisma.$transaction(async (tx) => {
			const now = new Date();
			await tx.productSku.updateMany({
				where: { productId: { in: validatedProductIds } },
				data: { deletedAt: now },
			});
			await tx.product.updateMany({
				where: { id: { in: validatedProductIds } },
				data: { deletedAt: now },
			});
		});

		// 8. Invalidate cache tags pour tous les produits supprimes
		for (const product of existingProducts) {
			const productTags = getProductInvalidationTags(product.slug, product.id);
			productTags.forEach(tag => updateTag(tag));

			// Si le produit appartenait a des collections, invalider aussi leurs caches
			for (const pc of product.collections) {
				const collectionTags = getCollectionInvalidationTags(
					pc.collection.slug
				);
				collectionTags.forEach(tag => updateTag(tag));
			}
		}

		// 9. Success
		return success(
			`${existingProducts.length} produit${existingProducts.length > 1 ? "s" : ""} supprimé${existingProducts.length > 1 ? "s" : ""} avec succès.`,
			{
				deletedCount: existingProducts.length,
				productIds: validatedProductIds,
			}
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression des produits");
	}
}
