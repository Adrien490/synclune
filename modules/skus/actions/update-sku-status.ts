"use server";

import { updateTags } from "@/shared/lib/cache";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateProductSkuStatusSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../constants/cache";

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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Acces non autorise. Droits administrateur requis.",
			};
		}

		// 2. Extraction des donnees du FormData
		const rawData = {
			skuId: formData.get("skuId") as string,
			isActive: formData.get("isActive") === "true",
		};

		// 3. Validation avec Zod
		const result = updateProductSkuStatusSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { skuId: validatedSkuId, isActive: validatedIsActive } = result.data;

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
			return {
				status: ActionStatus.NOT_FOUND,
				message: "La variante de produit n'existe pas.",
			};
		}

		// 5. Verifier qu'on ne desactive pas la variante principale
		if (existingSku.isDefault && !validatedIsActive) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Impossible de desactiver la variante principale d'un produit. Veuillez d'abord definir une autre variante comme principale.",
			};
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
			existingSku.product?.slug
		);
		updateTags(tags);

		// 8. Success
		return {
			status: ActionStatus.SUCCESS,
			message: `Variante ${updatedSku.sku} ${validatedIsActive ? "activee" : "desactivee"} avec succes.`,
			data: updatedSku,
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la mise a jour du statut.",
		};
	}
}
