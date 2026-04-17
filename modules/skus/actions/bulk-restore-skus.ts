"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_BULK_OPERATIONS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { BusinessError, handleActionError, safeFormGet, validateInput } from "@/shared/lib/actions";
import { bulkRestoreSkusSchema } from "../schemas/sku-media.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";
import { BULK_SKU_LIMITS } from "../constants/sku.constants";

/**
 * Restaure en masse des SKUs soft-deleted.
 * Atomique: si un seul conflit de combinaison variante existe, toute l'operation est annulee.
 */
export async function bulkRestoreSkus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_BULK_OPERATIONS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput(bulkRestoreSkusSchema, {
			ids: safeFormGet(formData, "ids"),
		});
		if ("error" in validation) return validation.error;
		const { ids } = validation.data;

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante selectionnee",
			};
		}
		if (ids.length > BULK_SKU_LIMITS.DEFAULT) {
			return {
				status: ActionStatus.ERROR,
				message: `Maximum ${BULK_SKU_LIMITS.DEFAULT} variantes par operation`,
			};
		}

		const skusData = await prisma.$transaction(async (tx) => {
			const found = await tx.productSku.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					sku: true,
					productId: true,
					colorId: true,
					materialId: true,
					size: true,
					deletedAt: true,
					product: { select: { slug: true, deletedAt: true } },
				},
			});

			if (found.length !== ids.length) {
				const missing = ids.length - found.length;
				throw new BusinessError(
					`${missing} variante(s) introuvable(s) sur ${ids.length} selectionnee(s)`,
				);
			}

			const notDeleted = found.filter((s) => s.deletedAt === null);
			if (notDeleted.length > 0) {
				throw new BusinessError(
					`${notDeleted.length} variante(s) selectionnee(s) ne sont pas supprimees.`,
				);
			}

			const parentDeleted = found.filter((s) => s.product.deletedAt !== null);
			if (parentDeleted.length > 0) {
				throw new BusinessError(
					"Le produit parent de certaines variantes est supprime. Restaurez le produit en premier.",
				);
			}

			// Detection de conflit de combinaison variante contre un SKU actif existant
			const conflicts: string[] = [];
			for (const sku of found) {
				const conflict = await tx.productSku.findFirst({
					where: {
						productId: sku.productId,
						colorId: sku.colorId,
						materialId: sku.materialId,
						size: sku.size,
						deletedAt: null,
						NOT: { id: sku.id },
					},
					select: { sku: true },
				});
				if (conflict) {
					conflicts.push(`${sku.sku} (conflit avec ${conflict.sku})`);
				}
			}
			if (conflicts.length > 0) {
				throw new BusinessError(
					`Restauration impossible pour ${conflicts.length} variante(s): ${conflicts.slice(0, 3).join(", ")}${conflicts.length > 3 ? "..." : ""}.`,
				);
			}

			await tx.productSku.updateMany({
				where: { id: { in: ids } },
				data: { deletedAt: null },
			});

			return found;
		});

		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.bulkRestore",
			targetType: "sku",
			targetId: ids.join(","),
			metadata: { count: ids.length },
		});

		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} variante(s) restauree(s) avec succes`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de restaurer les variantes");
	}
}
