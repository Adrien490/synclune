"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_BULK_OPERATIONS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { bulkDeactivateSkusSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";

const MAX_SKUS_PER_OPERATION = 100;

export async function bulkDeactivateSkus(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 0. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_BULK_OPERATIONS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 1. Vérification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		const rawData = {
			ids: formData.get("ids") as string,
		};

		const { ids } = bulkDeactivateSkusSchema.parse(rawData);

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante selectionnee",
			};
		}

		if (ids.length > MAX_SKUS_PER_OPERATION) {
			return {
				status: ActionStatus.ERROR,
				message: `Maximum ${MAX_SKUS_PER_OPERATION} variantes par operation`,
			};
		}

		// Récupérer les infos des SKUs pour validation et invalidation du cache
		const skusData = await prisma.productSku.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				sku: true,
				productId: true,
				isDefault: true,
				product: { select: { slug: true } },
			},
		});

		// Verifier qu'aucune variante par defaut n'est selectionnee
		const defaultSkus = skusData.filter((s) => s.isDefault);
		if (defaultSkus.length > 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Impossible de desactiver une variante par defaut",
			};
		}

		// Desactiver toutes les variantes et synchroniser les prix
		await prisma.$transaction(async (tx) => {
			await tx.productSku.updateMany({
				where: {
					id: {
						in: ids,
					},
				},
				data: {
					isActive: false,
				},
			});
		});

		// Invalider le cache (deduplique automatiquement les tags)
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} variante(s) désactivée(s) avec succès`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de désactiver les variantes");
	}
}
