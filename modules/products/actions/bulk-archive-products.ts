"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, notFound, validationError, handleActionError } from "@/shared/lib/actions";
import { bulkArchiveProductsSchema } from "../schemas/product.schemas";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { getProductInvalidationTags } from "../constants/cache";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT } from "@/shared/lib/rate-limit-config";

/**
 * Server Action pour archiver ou desarchiver plusieurs produits en masse
 * Compatible avec useActionState de React 19
 */
export async function bulkArchiveProducts(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		const productIdsRaw = formData.get("productIds") as string;
		const targetStatus = (formData.get("targetStatus") as string) || "ARCHIVED";

		// Parse le JSON des IDs
		let productIds: string[];
		try {
			productIds = JSON.parse(productIdsRaw);
		} catch {
			return validationError("Format des IDs de produits invalide.");
		}

		// 3. Validation avec Zod
		const validation = validateInput(bulkArchiveProductsSchema, {
			productIds,
			targetStatus,
		});
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Verifier que tous les produits existent
		const existingProducts = await prisma.product.findMany({
			where: {
				id: {
					in: validatedData.productIds,
				},
			},
			select: {
				id: true,
				title: true,
				slug: true,
				status: true,
				collections: { select: { collection: { select: { slug: true } } } },
			},
		});

		if (existingProducts.length !== validatedData.productIds.length) {
			return notFound("Un ou plusieurs produits");
		}

		// 5. Verifier s'il y a des commandes associees (warning informatif)
		let warningMessage: string | undefined;
		if (validatedData.targetStatus === "ARCHIVED") {
			const orderItemsCount = await prisma.orderItem.count({
				where: {
					productId: {
						in: validatedData.productIds,
					},
				},
			});

			if (orderItemsCount > 0) {
				warningMessage = `${orderItemsCount} commande${orderItemsCount > 1 ? "s sont" : " est"} associee${orderItemsCount > 1 ? "s" : ""} a ces produits. ${orderItemsCount > 1 ? "Elles" : "Elle"} resteront visible${orderItemsCount > 1 ? "s" : ""} dans l'historique.`;
			}
		}

		// 6. Mettre a jour le statut et desactiver les SKUs si archive
		await prisma.$transaction(async (tx) => {
			// Mettre a jour le statut de tous les produits
			await tx.product.updateMany({
				where: {
					id: {
						in: validatedData.productIds,
					},
				},
				data: {
					status: validatedData.targetStatus,
				},
			});

			// Si archivage, desactiver automatiquement tous les SKUs de ces produits
			if (validatedData.targetStatus === "ARCHIVED") {
				await tx.productSku.updateMany({
					where: {
						productId: {
							in: validatedData.productIds,
						},
					},
					data: {
						isActive: false,
					},
				});
			}
		});

		// 7. Invalidate cache tags pour tous les produits
		for (const product of existingProducts) {
			const productTags = getProductInvalidationTags(product.slug, product.id);
			productTags.forEach(tag => updateTag(tag));
		}

		// 7.1 Invalider les caches des collections associees (deduplique)
		const collectionSlugs = new Set<string>();
		for (const product of existingProducts) {
			for (const productCollection of product.collections) {
				collectionSlugs.add(productCollection.collection.slug);
			}
		}
		for (const slug of collectionSlugs) {
			getCollectionInvalidationTags(slug).forEach((tag) => updateTag(tag));
		}

		// 8. Message de succes
		const count = existingProducts.length;
		const actionLabel =
			validatedData.targetStatus === "ARCHIVED" ? "archivé" : "désarchivé";
		const successMessage = `${count} produit${count > 1 ? "s" : ""} ${actionLabel}${count > 1 ? "s" : ""} avec succès`;

		// 9. Success (avec warning si applicable)
		const finalMessage = warningMessage
			? `${successMessage}. ${warningMessage}`
			: successMessage;

		return success(finalMessage, {
			productIds: validatedData.productIds,
			count,
			targetStatus: validatedData.targetStatus,
			warning: warningMessage,
			products: existingProducts.map((p) => ({
				id: p.id,
				title: p.title,
				slug: p.slug,
			})),
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'archivage en masse");
	}
}
