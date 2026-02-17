"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_TOGGLE_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { updateProductSkuStatusSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour mettre a jour le statut actif/inactif d'un SKU
 * Compatible avec useActionState de React 19
 */
export async function updateProductSkuStatus(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_TOGGLE_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction des donnees du FormData
		const rawData = {
			skuId: formData.get("skuId") as string,
			isActive: formData.get("isActive") === "true",
		};

		// 4. Validation avec Zod
		const validated = validateInput(updateProductSkuStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { skuId: validatedSkuId, isActive: validatedIsActive } = validated.data;

		// 5. Verifier que le SKU existe et recuperer les infos pour invalidation
		const existingSku = await prisma.productSku.findUnique({
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

		if (!existingSku) {
			return error("La variante de produit n'existe pas.");
		}

		// 6. Verifier qu'on ne desactive pas la variante principale
		if (existingSku.isDefault && !validatedIsActive) {
			return error(
				"Impossible de desactiver la variante principale d'un produit. Veuillez d'abord definir une autre variante comme principale."
			);
		}

		// 7. Mettre a jour le statut
		const updatedSku = await prisma.productSku.update({
			where: { id: validatedSkuId },
			data: { isActive: validatedIsActive },
			select: {
				id: true,
				sku: true,
				isActive: true,
			},
		});

		// 8. Invalider les cache tags concernes
		const tags = getSkuInvalidationTags(
			updatedSku.sku,
			existingSku.productId,
			existingSku.product?.slug,
			updatedSku.id
		);
		tags.forEach(tag => updateTag(tag));

		// 9. Success
		return success(
			`Variante ${updatedSku.sku} ${validatedIsActive ? "activee" : "desactivee"} avec succes.`,
			updatedSku
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour du statut");
	}
}
