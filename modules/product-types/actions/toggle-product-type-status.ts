"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { toggleProductTypeStatusSchema } from "../schemas/product-type.schemas";

export async function toggleProductTypeStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.TOGGLE_STATUS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			productTypeId: safeFormGet(formData, "productTypeId"),
			isActive: formData.get("isActive") === "true",
		};

		const validated = validateInput(toggleProductTypeStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { productTypeId, isActive } = validated.data;

		// updateMany atomique : guard isSystem=false + isActive != target inclus dans le WHERE
		// evite la fenetre TOCTOU entre findUnique et update
		const updateResult = await prisma.productType.updateMany({
			where: {
				id: productTypeId,
				isSystem: false,
				isActive: { not: isActive },
			},
			data: { isActive },
		});

		if (updateResult.count === 0) {
			// Discriminer la raison : notFound / isSystem / deja dans l'etat demande
			const productType = await prisma.productType.findUnique({
				where: { id: productTypeId },
				select: { id: true, isSystem: true, isActive: true, label: true },
			});

			if (!productType) {
				return notFound("Type de produit");
			}

			if (productType.isSystem) {
				return error(
					`Le type "${productType.label}" est un type systeme et ne peut pas etre modifie`,
				);
			}

			// Idempotent : deja dans l'etat demande
			return success(`Type déjà ${isActive ? "activé" : "désactivé"}`);
		}

		// Recuperer label + slug pour audit log et invalidation détail granulaire
		const updated = await prisma.productType.findUnique({
			where: { id: productTypeId },
			select: { label: true, slug: true },
		});

		getProductTypeInvalidationTags(updated?.slug).forEach((tag) => updateTag(tag));

		// Avertir — pas bloquer. La desactivation EST le mecanisme de retrait doux :
		// `getProductTypeOptions` filtre isActive, donc le type disparait des nouveaux
		// bijoux tandis que les existants le conservent. Bloquer sur l'usage rendrait le
		// retrait impossible pour les types justement utilises, alors que
		// `deleteProductType` bloque deja sur les produits PUBLIC : l'admin n'aurait plus
		// aucun chemin de retrait. Hors du updateMany atomique : purement informatif,
		// un TOCTOU sur ce compte est sans consequence.
		let usageWarning = "";
		if (!isActive) {
			const usageCount = await prisma.product.count({
				where: { typeId: productTypeId, deletedAt: null },
			});
			if (usageCount > 0) {
				usageWarning =
					usageCount > 1
						? ` ${usageCount} bijoux l'utilisent encore : ils le conservent, mais il ne sera plus proposé pour les nouveaux bijoux.`
						: ` 1 bijou l'utilise encore : il le conserve, mais le type ne sera plus proposé pour les nouveaux bijoux.`;
			}
		}

		return success(`Type ${isActive ? "activé" : "désactivé"} avec succès${usageWarning}`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut");
	}
}
