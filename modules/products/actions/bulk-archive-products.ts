"use server";

import { ProductStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { bulkArchiveProductsSchema } from "../schemas/product.schemas";
import { canTransitionProductStatus } from "../services/product-status-validation.service";
import { validateProductForPublication } from "../services/product-validation.service";
import { getProductInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action — archivage / restauration en lot.
 *
 * Toggle entre PUBLIC ↔ ARCHIVED. Les SKUs sont désactivés automatiquement
 * lors d'un archivage (parité avec `toggleProductStatus`). Audit log par
 * produit pour traçabilité.
 *
 * formData :
 * - `productIds`        : JSON array de cuid2 (1..100)
 * - `targetStatus`      : "ARCHIVED" | "PUBLIC" (défaut "ARCHIVED")
 */
export async function bulkArchiveProducts(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "productIds");
		if ("error" in idsResult) return idsResult.error;

		const validation = validateInput(bulkArchiveProductsSchema, {
			productIds: idsResult.ids,
			targetStatus: safeFormGet(formData, "targetStatus") ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { productIds, targetStatus } = validation.data;

		const products = await prisma.product.findMany({
			where: { id: { in: productIds }, deletedAt: null },
			select: {
				id: true,
				title: true,
				slug: true,
				status: true,
				collections: { select: { collection: { select: { slug: true } } } },
				// MEDIA-AUDIT-001 : charge stock + type des medias pour valider la
				// publication lors d'une restauration ARCHIVED → PUBLIC.
				skus: {
					where: { deletedAt: null },
					select: {
						id: true,
						isActive: true,
						inventory: true,
						images: { select: { mediaType: true } },
					},
				},
			},
		});

		if (products.length === 0) {
			return error("Aucun produit valide trouvé");
		}

		const transitionable = products.filter((p) =>
			canTransitionProductStatus(p.status, targetStatus),
		);

		if (transitionable.length === 0) {
			return error(
				targetStatus === ProductStatus.ARCHIVED
					? "Tous les produits sélectionnés sont déjà archivés"
					: "Tous les produits sélectionnés sont déjà publics",
			);
		}

		// MEDIA-AUDIT-001 : une restauration vers PUBLIC doit passer la validation
		// metier (titre + SKU actif avec stock + image), comme toggle/bulk-change/update.
		// `canTransitionProductStatus` ne controle QUE la state machine.
		const eligible: typeof transitionable = [];
		const skippedForValidation: { title: string; reason: string }[] = [];

		if (targetStatus === ProductStatus.PUBLIC) {
			for (const product of transitionable) {
				const result = validateProductForPublication(product);
				if (!result.isValid) {
					skippedForValidation.push({
						title: product.title,
						reason: result.errorMessage ?? "Validation échouée",
					});
					continue;
				}
				eligible.push(product);
			}

			if (eligible.length === 0) {
				return error(
					`Aucun produit n'est prêt à être publié : ${skippedForValidation
						.slice(0, 3)
						.map((s) => `« ${s.title} »`)
						.join(", ")}${skippedForValidation.length > 3 ? ", …" : ""}.`,
				);
			}
		} else {
			eligible.push(...transitionable);
		}

		const eligibleIds = eligible.map((p) => p.id);

		await prisma.$transaction(
			async (tx) => {
				await tx.product.updateMany({
					where: { id: { in: eligibleIds } },
					data: { status: targetStatus },
				});

				if (targetStatus === ProductStatus.ARCHIVED) {
					await tx.productSku.updateMany({
						where: { productId: { in: eligibleIds } },
						data: { isActive: false },
					});
				}
			},
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		const tags = new Set<string>();
		for (const p of eligible) {
			getProductInvalidationTags(p.slug, p.id).forEach((tag) => tags.add(tag));
			for (const link of p.collections) {
				getCollectionInvalidationTags(link.collection.slug).forEach((tag) => tags.add(tag));
			}
		}
		tags.forEach((tag) => updateTag(tag));

		const verb = targetStatus === ProductStatus.ARCHIVED ? "archivé" : "restauré";
		const plural = eligibleIds.length > 1 ? "s" : "";
		const suffix =
			skippedForValidation.length > 0
				? `. ${skippedForValidation.length} produit${skippedForValidation.length > 1 ? "s" : ""} en attente (validation).`
				: " avec succès";
		return success(`${eligibleIds.length} produit${plural} ${verb}${plural}${suffix}`, {
			count: eligibleIds.length,
			skippedCount: skippedForValidation.length,
			targetStatus,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'opération groupée");
	}
}
