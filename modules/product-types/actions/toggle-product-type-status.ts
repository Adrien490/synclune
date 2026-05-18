"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
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

		return success(`Type ${isActive ? "activé" : "désactivé"} avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut");
	}
}
