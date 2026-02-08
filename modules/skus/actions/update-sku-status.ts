"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
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
		// 1. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Extraction des donnees du FormData
		const rawData = {
			skuId: formData.get("skuId") as string,
			isActive: formData.get("isActive") === "true",
		};

		// 3. Validation avec Zod
		const validated = validateInput(updateProductSkuStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { skuId: validatedSkuId, isActive: validatedIsActive } = validated.data;

		// 4. Verifier que le SKU existe et recuperer les infos pour invalidation
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

		// 5. Verifier qu'on ne desactive pas la variante principale
		if (existingSku.isDefault && !validatedIsActive) {
			return error(
				"Impossible de desactiver la variante principale d'un produit. Veuillez d'abord definir une autre variante comme principale."
			);
		}

		// 6. Mettre a jour le statut
		const updatedSku = await prisma.productSku.update({
			where: { id: validatedSkuId },
			data: { isActive: validatedIsActive },
			select: {
				id: true,
				sku: true,
				isActive: true,
			},
		});

		// 7. Invalider les cache tags concernes
		const tags = getSkuInvalidationTags(
			updatedSku.sku,
			existingSku.productId,
			existingSku.product?.slug,
			updatedSku.id // Invalide aussi le cache stock temps réel
		);
		tags.forEach(tag => updateTag(tag));

		// 8. Success
		return success(
			`Variante ${updatedSku.sku} ${validatedIsActive ? "activee" : "desactivee"} avec succes.`,
			updatedSku
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour du statut");
	}
}
