"use server";

import { ProductStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { logAudit } from "@/shared/lib/audit-log";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { bulkArchiveProductsSchema } from "../schemas/product.schemas";
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
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

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
			},
		});

		if (products.length === 0) {
			return error("Aucun produit valide trouvé");
		}

		const eligible = products.filter((p) => p.status !== targetStatus);

		if (eligible.length === 0) {
			return error(
				targetStatus === ProductStatus.ARCHIVED
					? "Tous les produits sélectionnés sont déjà archivés"
					: "Tous les produits sélectionnés sont déjà publics",
			);
		}

		const eligibleIds = eligible.map((p) => p.id);

		await prisma.$transaction(async (tx) => {
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
		});

		const tags = new Set<string>();
		for (const p of eligible) {
			getProductInvalidationTags(p.slug, p.id).forEach((tag) => tags.add(tag));
			for (const link of p.collections) {
				getCollectionInvalidationTags(link.collection.slug).forEach((tag) => tags.add(tag));
			}
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action:
				targetStatus === ProductStatus.ARCHIVED ? "product.bulkArchive" : "product.bulkRestore",
			targetType: "product",
			targetId: eligibleIds.join(","),
			metadata: {
				count: eligibleIds.length,
				targetStatus,
				productIds: eligibleIds,
			},
		});

		const verb = targetStatus === ProductStatus.ARCHIVED ? "archivé" : "restauré";
		const plural = eligibleIds.length > 1 ? "s" : "";
		return success(`${eligibleIds.length} produit${plural} ${verb}${plural} avec succès`, {
			count: eligibleIds.length,
			targetStatus,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'opération groupée");
	}
}
