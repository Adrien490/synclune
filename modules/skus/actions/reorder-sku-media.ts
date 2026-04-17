"use server";

import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_REORDER_MEDIA_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import {
	BusinessError,
	handleActionError,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { reorderSkuMediaSchema } from "../schemas/sku-media.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Reordonne les medias d'un SKU (drag-and-drop admin) sans recreer les entrees ni
 * toucher aux fichiers UploadThing. Update atomique des positions dans une transaction.
 */
export async function reorderSkuMedia(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_REORDER_MEDIA_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const rawMediaIds = safeFormGet(formData, "mediaIds");
		let parsedMediaIds: unknown;
		try {
			parsedMediaIds = rawMediaIds ? JSON.parse(rawMediaIds) : [];
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "mediaIds: JSON invalide",
			};
		}

		const validation = validateInput(reorderSkuMediaSchema, {
			skuId: safeFormGet(formData, "skuId"),
			mediaIds: parsedMediaIds,
		});
		if ("error" in validation) return validation.error;
		const { skuId, mediaIds } = validation.data;

		const skuInfo = await prisma.$transaction(async (tx) => {
			const sku = await tx.productSku.findUnique({
				where: { id: skuId },
				select: {
					id: true,
					sku: true,
					productId: true,
					product: { select: { slug: true } },
					images: { select: { id: true } },
				},
			});

			if (!sku) {
				throw new BusinessError("La variante de produit n'existe pas.");
			}

			const existingIds = new Set(sku.images.map((m) => m.id));
			if (mediaIds.length !== existingIds.size) {
				throw new BusinessError(
					"La liste fournie doit contenir exactement tous les medias du SKU.",
				);
			}
			for (const id of mediaIds) {
				if (!existingIds.has(id)) {
					throw new BusinessError("Un media fourni n'appartient pas a ce SKU.");
				}
			}

			await Promise.all(
				mediaIds.map((mediaId, index) =>
					tx.skuMedia.update({
						where: { id: mediaId },
						data: { position: index },
					}),
				),
			);

			return sku;
		});

		const tags = getSkuInvalidationTags(
			skuInfo.sku,
			skuInfo.productId,
			skuInfo.product.slug,
			skuInfo.id,
		);
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.reorderMedia",
			targetType: "sku",
			targetId: skuInfo.id,
			metadata: { sku: skuInfo.sku, mediaCount: mediaIds.length },
		});

		return success("Ordre des medias mis a jour.", {
			skuId: skuInfo.id,
			mediaCount: mediaIds.length,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de reordonner les medias du SKU");
	}
}
