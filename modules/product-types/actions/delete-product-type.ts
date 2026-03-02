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
import { deleteProductTypeSchema } from "../schemas/product-type.schemas";

/**
 * Server Action pour supprimer un ProductType
 * Protection: Les types systeme (isSystem: true) et ceux avec produits actifs ne peuvent pas etre supprimes
 */
export async function deleteProductType(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction et validation
		const rawData = {
			productTypeId: safeFormGet(formData, "productTypeId"),
		};

		const validated = validateInput(deleteProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const { productTypeId } = validated.data;

		// 4. Verifier et supprimer dans une transaction pour eviter les race conditions
		const result = await prisma.$transaction(async (tx) => {
			const pt = await tx.productType.findUnique({
				where: { id: productTypeId },
				select: {
					id: true,
					isSystem: true,
					label: true,
					_count: {
						select: {
							products: {
								where: {
									status: "PUBLIC",
									skus: { some: { isActive: true } },
								},
							},
						},
					},
				},
			});

			if (!pt) return { status: "notFound" as const };

			if (pt.isSystem) {
				return {
					status: "blocked" as const,
					message: `Le type "${pt.label}" est un type systeme et ne peut pas etre supprime`,
				};
			}

			if (pt._count.products > 0) {
				return {
					status: "blocked" as const,
					message: `Le type "${pt.label}" a ${pt._count.products} produit(s) actif(s) et ne peut pas etre supprime`,
				};
			}

			await tx.productType.delete({ where: { id: productTypeId } });
			return { status: "deleted" as const, label: pt.label };
		});

		if (result.status === "notFound") {
			return notFound("Type de produit");
		}

		if (result.status === "blocked") {
			return error(result.message);
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "productType.delete",
			targetType: "productType",
			targetId: productTypeId,
			metadata: { label: result.label },
		});

		// 5. Invalidation du cache
		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Type de produit supprimé avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}
