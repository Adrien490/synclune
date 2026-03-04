"use server";

import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_TOGGLE_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	BusinessError,
	handleActionError,
	success,
	safeFormGet,
} from "@/shared/lib/actions";
import { updateProductSkuStatusSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour mettre a jour le statut actif/inactif d'un SKU
 * Compatible avec useActionState de React 19
 */
export async function updateProductSkuStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_TOGGLE_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction des donnees du FormData
		const rawData = {
			skuId: safeFormGet(formData, "skuId"),
			isActive: formData.get("isActive") === "true",
		};

		// 4. Validation avec Zod
		const validated = validateInput(updateProductSkuStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { skuId: validatedSkuId, isActive: validatedIsActive } = validated.data;

		// 5. Vérifier existence, règles métier, et mettre à jour dans une transaction
		const { existingSku, updatedSku } = await prisma.$transaction(async (tx) => {
			const existing = await tx.productSku.findUnique({
				where: { id: validatedSkuId },
				select: {
					id: true,
					sku: true,
					isActive: true,
					isDefault: true,
					productId: true,
					product: {
						select: {
							slug: true,
						},
					},
				},
			});

			if (!existing) {
				throw new BusinessError("La variante de produit n'existe pas.");
			}

			// Verifier qu'on ne desactive pas la variante principale
			if (existing.isDefault && !validatedIsActive) {
				throw new BusinessError(
					"Impossible de désactiver la variante principale d'un produit. Veuillez d'abord définir une autre variante comme principale.",
				);
			}

			const updated = await tx.productSku.update({
				where: { id: validatedSkuId },
				data: { isActive: validatedIsActive },
				select: {
					id: true,
					sku: true,
					isActive: true,
				},
			});

			return { existingSku: existing, updatedSku: updated };
		});

		// 6. Invalider les cache tags concernes
		const tags = getSkuInvalidationTags(
			updatedSku.sku,
			existingSku.productId,
			existingSku.product.slug,
			updatedSku.id,
		);
		tags.forEach((tag) => updateTag(tag));

		// 7. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.updateStatus",
			targetType: "sku",
			targetId: updatedSku.id,
			metadata: { sku: updatedSku.sku, isActive: validatedIsActive },
		});

		// 8. Success
		return success(
			`Variante ${updatedSku.sku} ${validatedIsActive ? "activée" : "désactivée"} avec succès.`,
			updatedSku,
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour du statut");
	}
}
