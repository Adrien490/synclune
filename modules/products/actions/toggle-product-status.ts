"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	notFound,
	validationError,
	handleActionError,
	safeFormGet,
} from "@/shared/lib/actions";
import { toggleProductStatusSchema } from "../schemas/product.schemas";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { validateProductForPublication } from "../services/product-validation.service";
import { canTransitionProductStatus } from "../services/product-status-validation.service";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";

/**
 * Server Action pour basculer le statut d'un produit
 * DRAFT <-> PUBLIC (toggle simple)
 * ARCHIVED -> DRAFT (restauration)
 *
 * La restauration vise DRAFT, jamais PUBLIC : l'archivage desactive TOUS les SKUs
 * du produit (cf. etape 6), et `validateProductForPublication` exige >= 1 SKU actif
 * avec stock et image. Viser PUBLIC rendait donc tout produit archive via l'UI
 * definitivement irrecuperable (« aucune variante active »). DRAFT est le seul
 * statut coherent avec les donnees post-archivage ; republier reste un geste
 * explicite, apres reactivation manuelle d'au moins une variante.
 *
 * Compatible avec useActionState de React 19
 */
export async function toggleProductStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		const rawData = {
			productId: safeFormGet(formData, "productId"),
			currentStatus: safeFormGet(formData, "currentStatus"),
			targetStatus: safeFormGet(formData, "targetStatus"),
		};

		// 3. Validation avec Zod
		const validation = validateInput(toggleProductStatusSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId, currentStatus, targetStatus } = validation.data;

		// 4. Verifier que le produit existe et recuperer toutes les donnees necessaires
		// (requete unique pour eviter N+1)
		// deletedAt: null — un produit soft-deleted est ARCHIVED + deletedAt ; sans ce filtre,
		// la transition ARCHIVED → PUBLIC le ressusciterait en gardant son deletedAt (état
		// zombie visible dans les selects filtrés sur status seul).
		const existingProduct = await prisma.product.findUnique({
			where: { id: productId, deletedAt: null },
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
						// MEDIA-AUDIT-002 : on charge le type de chaque media (pas seulement
						// l'image primaire) pour que validateProductForPublication exige une
						// vraie image (mediaType IMAGE), pas une video isPrimary.
						images: { select: { mediaType: true } },
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
			// Sinon, logique de toggle par defaut. On se base sur le statut lu en DB et
			// non sur le `currentStatus` fourni par le client : une ligne de liste
			// perimee produirait sinon une transition identite refusee (5.4).
			// DRAFT <-> PUBLIC (toggle)
			// ARCHIVED -> DRAFT (restauration, cf. docstring)
			if (existingProduct.status === "ARCHIVED") {
				newStatus = "DRAFT";
			} else if (existingProduct.status === "DRAFT") {
				newStatus = "PUBLIC";
			} else {
				newStatus = "DRAFT";
			}
		}

		// 5.4. Garde state machine : refuser les transitions invalides
		if (!canTransitionProductStatus(existingProduct.status, newStatus)) {
			return validationError(
				`Transition de statut invalide : ${existingProduct.status} → ${newStatus}`,
			);
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
		const productTags = getProductInvalidationTags(existingProduct.slug, existingProduct.id);
		productTags.forEach((tag) => updateTag(tag));

		// 7.1 Invalider les caches des collections associees
		for (const productCollection of existingProduct.collections) {
			getCollectionInvalidationTags(productCollection.collection.slug).forEach((tag) =>
				updateTag(tag),
			);
		}

		// 8. Messages de succes contextuels. La restauration a son propre libelle :
		// arriver en brouillon sans savoir que les variantes ont ete desactivees
		// laisserait l'admin devant un « Publier » qui echoue.
		const isRestore = existingProduct.status === "ARCHIVED" && newStatus === "DRAFT";
		const statusMessages: Record<typeof newStatus, string> = {
			DRAFT: isRestore
				? `"${existingProduct.title}" restaure en brouillon. Reactivez au moins une variante (stock + image) pour pouvoir le publier.`
				: `"${existingProduct.title}" mis en brouillon`,
			PUBLIC: `"${existingProduct.title}" publie`,
			ARCHIVED: `"${existingProduct.title}" archive`,
		};

		// 9. Audit log

		// 10. Success (avec warning si applicable)
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
