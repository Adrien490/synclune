"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { deleteProductSchema } from "../schemas/product.schemas";
import { UTApi } from "uploadthing/server";
import { getProductInvalidationTags } from "../constants/cache";

const utapi = new UTApi();

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
		const result = deleteProductSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { productId } = result.data;

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
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Le produit n'existe pas.",
			};
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
			return {
				status: ActionStatus.ERROR,
				message:
					`Ce produit ne peut pas etre supprime car il est associe a ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
					"Pour conserver l'historique des commandes, veuillez archiver le produit a la place.",
			};
		}

		// 6. Supprimer tous les fichiers UploadThing de toutes les variantes
		const allImageUrls = existingProduct.skus.flatMap((sku) =>
			sku.images.map((img) => img.url)
		);

		if (allImageUrls.length > 0) {
			try {
				const fileKeys = allImageUrls.map(extractFileKeyFromUrl);
				await utapi.deleteFiles(fileKeys);
			} catch (uploadthingError) {
				// Ignore - ne bloque pas la suppression du produit
			}
		}

		// 7. Supprimer le produit dans une transaction
		await prisma.$transaction(async (tx) => {
			// Les SKUs et entrees SkuMedia seront supprimes automatiquement grace a onDelete: Cascade
			await tx.product.delete({
				where: { id: productId },
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
		return {
			status: ActionStatus.SUCCESS,
			message: `Produit "${existingProduct.title}" supprimé avec succès.`,
			data: {
				productId,
				title: existingProduct.title,
				slug: existingProduct.slug,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la suppression du produit.",
		};
	}
}
