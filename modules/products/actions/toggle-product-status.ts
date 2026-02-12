"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, notFound, validationError, handleActionError } from "@/shared/lib/actions";
import { toggleProductStatusSchema } from "../schemas/product.schemas";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { validateProductForPublication } from "../services/product-validation.service";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";

/**
 * Server Action pour basculer le statut d'un produit
 * DRAFT <-> PUBLIC (toggle simple)
 * Compatible avec useActionState de React 19
 */
export async function toggleProductStatus(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		const rawData = {
			productId: formData.get("productId") as string,
			currentStatus: formData.get("currentStatus") as string,
			targetStatus: formData.get("targetStatus") as string | null,
		};

		// 3. Validation avec Zod
		const validation = validateInput(toggleProductStatusSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId, currentStatus, targetStatus } = validation.data;

		// 4. Verifier que le produit existe et recuperer toutes les donnees necessaires
		// (requete unique pour eviter N+1)
		const existingProduct = await prisma.product.findUnique({
			where: { id: productId },
			select: {
				id: true,
				title: true,
				slug: true,
				status: true,
				description: true,
				collections: { select: { collection: { select: { slug: true } } } },
				skus: {
					select: {
						id: true,
						isActive: true,
						inventory: true,
						images: {
							where: { isPrimary: true },
							select: { id: true },
						},
					},
				},
			},
		});

		if (!existingProduct) {
			return notFound("Le produit");
		}

		// 5. Determiner le nouveau statut
		let newStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";

		if (targetStatus) {
			// Si un statut cible est fourni, l'utiliser directement
			newStatus = targetStatus;
		} else {
			// Sinon, logique de toggle par defaut
			// DRAFT <-> PUBLIC (toggle)
			// ARCHIVED -> PUBLIC (restore)
			if (currentStatus === "ARCHIVED") {
				newStatus = "PUBLIC";
			} else if (currentStatus === "DRAFT") {
				newStatus = "PUBLIC";
			} else {
				newStatus = "DRAFT";
			}
		}

		// 5.5. Validation metier : Un produit PUBLIC doit avoir au moins 1 SKU actif avec stock
		if (newStatus === "PUBLIC") {
			const pubValidation = validateProductForPublication(existingProduct);
			if (!pubValidation.isValid) {
				return validationError(pubValidation.errorMessage!);
			}
		}

		// 5.6. Verifier si le produit a des commandes (warning informatif pour ARCHIVED)
		let warningMessage: string | undefined;
		if (newStatus === "ARCHIVED") {
			const orderItemsCount = await prisma.orderItem.count({
				where: { productId },
			});

			if (orderItemsCount > 0) {
				warningMessage = `Ce produit a ${orderItemsCount} commande${orderItemsCount > 1 ? "s" : ""} associee${orderItemsCount > 1 ? "s" : ""}. Il restera visible dans l'historique des commandes.`;
			}
		}

		// 6. Mettre a jour le statut et desactiver les SKUs si archive
		await prisma.$transaction(async (tx) => {
			await tx.product.update({
				where: { id: productId },
				data: { status: newStatus },
			});

			// Si le produit est archive, desactiver automatiquement tous ses SKUs
			if (newStatus === "ARCHIVED") {
				await tx.productSku.updateMany({
					where: { productId },
					data: { isActive: false },
				});
			}
		});

		// 7. Invalidate cache tags (invalidation ciblee)
		const productTags = getProductInvalidationTags(
			existingProduct.slug,
			existingProduct.id
		);
		productTags.forEach(tag => updateTag(tag));

		// 7.1 Invalider les caches des collections associees
		for (const productCollection of existingProduct.collections) {
			getCollectionInvalidationTags(productCollection.collection.slug).forEach((tag) => updateTag(tag));
		}

		// 8. Messages de succes contextuels
		const statusMessages: Record<typeof newStatus, string> = {
			DRAFT: `"${existingProduct.title}" mis en brouillon`,
			PUBLIC: `"${existingProduct.title}" publie`,
			ARCHIVED: `"${existingProduct.title}" archive`,
		};

		// 9. Success (avec warning si applicable)
		const successMessage = warningMessage
			? `${statusMessages[newStatus]}. ${warningMessage}`
			: statusMessages[newStatus];

		return success(successMessage, {
			productId,
			title: existingProduct.title,
			oldStatus: currentStatus,
			newStatus,
			warning: warningMessage,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du changement de statut");
	}
}
