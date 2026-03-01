"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
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
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

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

		// Verifier que le type existe et n'est pas systeme
		const productType = await prisma.productType.findUnique({
			where: { id: productTypeId },
			select: { id: true, isSystem: true, label: true },
		});

		if (!productType) {
			return notFound("Type de produit");
		}

		if (productType.isSystem) {
			return error(
				`Le type "${productType.label}" est un type systeme et ne peut pas etre modifie`,
			);
		}

		// Mettre a jour le statut
		await prisma.productType.update({
			where: { id: productTypeId },
			data: { isActive },
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "productType.toggleStatus",
			targetType: "productType",
			targetId: productTypeId,
			metadata: { label: productType.label, isActive },
		});

		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success(`Type ${isActive ? "activé" : "désactivé"} avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut");
	}
}
