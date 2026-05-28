"use server";

import { updateTag } from "next/cache";

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
import { ADMIN_PRODUCT_BULK_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { bulkChangeProductStatusSchema } from "../schemas/product.schemas";
import { canTransitionProductStatus } from "../services/product-status-validation.service";
import { validateProductForPublication } from "../services/product-validation.service";
import { getProductInvalidationTags } from "../utils/cache.utils";

const STATUS_VERB: Record<ProductStatus, { singular: string; plural: string }> = {
	DRAFT: { singular: "remis en brouillon", plural: "remis en brouillon" },
	PUBLIC: { singular: "exposé en vitrine", plural: "exposés en vitrine" },
	ARCHIVED: { singular: "remisé à l'atelier", plural: "remisés à l'atelier" },
};

/**
 * Change le statut en lot vers DRAFT/PUBLIC/ARCHIVED. Complement de
 * `bulkArchiveProducts` (qui ne couvre que PUBLIC↔ARCHIVED) pour les flows
 * "publier N brouillons" / "depublier N fiches en revision".
 */
export async function bulkChangeProductStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_BULK_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "productIds");
		if ("error" in idsResult) return idsResult.error;

		const validation = validateInput(bulkChangeProductStatusSchema, {
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
				skus: {
					select: {
						id: true,
						isActive: true,
						inventory: true,
						// MEDIA-AUDIT-002 : type de chaque media pour exiger une vraie image.
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
			const verb = STATUS_VERB[targetStatus];
			return error(`Tous les produits sélectionnés sont déjà ${verb.singular}`);
		}

		const eligible: typeof transitionable = [];
		const skippedForValidation: { title: string; reason: string }[] = [];

		for (const product of transitionable) {
			if (targetStatus === ProductStatus.PUBLIC) {
				const result = validateProductForPublication(product);
				if (!result.isValid) {
					skippedForValidation.push({
						title: product.title,
						reason: result.errorMessage ?? "Validation échouée",
					});
					continue;
				}
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

		const verb = STATUS_VERB[targetStatus];
		const plural = eligibleIds.length > 1 ? "s" : "";
		const verbForm = eligibleIds.length > 1 ? verb.plural : verb.singular;
		const baseMessage = `${eligibleIds.length} bijou${plural} ${verbForm}`;
		const suffix =
			skippedForValidation.length > 0
				? `. ${skippedForValidation.length} produit${skippedForValidation.length > 1 ? "s" : ""} en attente (validation).`
				: ".";

		return success(`${baseMessage}${suffix}`, {
			count: eligibleIds.length,
			skippedCount: skippedForValidation.length,
			targetStatus,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du changement de statut groupé");
	}
}
