"use server";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, safeFormGet } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { exportProductTypesSchema } from "../schemas/product-type.schemas";
import {
	buildProductTypeExport,
	type ProductTypeExportRow,
} from "../services/export-builder.service";

/**
 * Server Action pour exporter les ProductTypes au format CSV ou JSON.
 *
 * Colonnes: label, slug, description, isActive, isSystem, productsCount,
 * customizationsCount, createdAt. Tri alphabetique par label.
 *
 * Usage: backup, audit, reconciliation externe.
 */
export async function exportProductTypes(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.EXPORT);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(exportProductTypesSchema, {
			format: safeFormGet(formData, "format"),
		});
		if ("error" in validated) return validated.error;
		const { format } = validated.data;

		const productTypes = await prisma.productType.findMany({
			select: {
				label: true,
				slug: true,
				description: true,
				isActive: true,
				isSystem: true,
				createdAt: true,
				_count: {
					select: {
						products: true,
						customizationRequests: true,
					},
				},
			},
			orderBy: { label: "asc" },
		});

		const rows: ProductTypeExportRow[] = productTypes.map((pt) => ({
			label: pt.label,
			slug: pt.slug,
			description: pt.description,
			isActive: pt.isActive,
			isSystem: pt.isSystem,
			productsCount: pt._count.products,
			customizationsCount: pt._count.customizationRequests,
			createdAt: pt.createdAt,
		}));

		const payload = buildProductTypeExport(format, rows);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "productType.export",
			targetType: "productType",
			targetId: "all",
			metadata: { format, count: rows.length },
		});

		return success("Rapport généré", payload);
	} catch (e) {
		return handleActionError(e, "Impossible d'exporter les types de produit");
	}
}
