"use server";

import { updateTag } from "next/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { toggleProductStatusSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../constants/cache";

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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Acces non autorise. Droits administrateur requis.",
			};
		}

		// 2. Extraction des donnees du FormData
		const rawData = {
			productId: formData.get("productId") as string,
			currentStatus: formData.get("currentStatus") as string,
			targetStatus: formData.get("targetStatus") as string | null,
		};

		// 3. Validation avec Zod
		const result = toggleProductStatusSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { productId, currentStatus, targetStatus } = result.data;

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
				skus: {
					where: { isActive: true },
					select: {
						id: true,
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
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Le produit n'existe pas.",
			};
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
			// Validation: titre requis
			if (!existingProduct.title || existingProduct.title.trim().length === 0) {
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message:
						"Impossible de publier ce produit car le titre est vide. Veuillez renseigner un titre.",
				};
			}

			// Validation: au moins 1 SKU actif
			if (existingProduct.skus.length === 0) {
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message:
						"Impossible de publier ce produit car il n'a aucun SKU actif. Veuillez activer au moins un SKU avant de publier.",
				};
			}

			// Validation: au moins 1 SKU actif avec stock
			const hasStock = existingProduct.skus.some(sku => sku.inventory > 0);
			if (!hasStock) {
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message:
						"Impossible de publier ce produit car aucun SKU actif n'a de stock. Veuillez ajouter du stock a au moins une variante.",
				};
			}

			// Validation: au moins 1 SKU actif avec image principale
			const hasImage = existingProduct.skus.some(sku => sku.images.length > 0);
			if (!hasImage) {
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message:
						"Impossible de publier ce produit car aucun SKU actif n'a d'image principale. Veuillez ajouter une image a au moins une variante.",
				};
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

		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				productId,
				title: existingProduct.title,
				oldStatus: currentStatus,
				newStatus,
				warning: warningMessage,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors du changement de statut.",
		};
	}
}
