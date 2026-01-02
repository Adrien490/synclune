"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Set a SKU as the default SKU for its product
 *
 * BUSINESS RULE: Only one SKU can be default per product
 *
 * This function guarantees isDefault uniqueness at application level via:
 * 1. Atomic transaction to prevent race conditions
 * 2. Deactivate all isDefault for the product
 * 3. Activate the selected SKU
 */
export async function setDefaultSku(
	_prev: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Check admin rights
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Get SKU ID
		const skuId = formData.get("skuId") as string;

		if (!skuId) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Missing SKU ID",
			};
		}

		// 3. Verify SKU exists and get productId
		const skuData = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				sku: true,
				productId: true,
				isActive: true,
				product: {
					select: {
						title: true,
						slug: true,
					},
				},
			},
		});

		if (!skuData) {
			return {
				status: ActionStatus.ERROR,
				message: "SKU not found",
			};
		}

		if (!skuData.isActive) {
			return {
				status: ActionStatus.ERROR,
				message: "Cannot set an inactive SKU as default",
			};
		}

		// 4. Atomic transaction to guarantee uniqueness
		await prisma.$transaction([
			// Deactivate all isDefault for the product
			prisma.productSku.updateMany({
				where: { productId: skuData.productId },
				data: { isDefault: false },
			}),
			// Activate the selected SKU
			prisma.productSku.update({
				where: { id: skuId },
				data: { isDefault: true },
			}),
		]);

		// 5. Invalidate cache
		const tags = getSkuInvalidationTags(
			skuData.sku,
			skuData.productId,
			skuData.product.slug,
			skuId // Invalide aussi le cache stock temps réel
		);
		tags.forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Default SKU updated successfully",
		};
	} catch (error) {
// console.error("[SET_DEFAULT_SKU]", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "An error occurred while updating the default SKU",
		};
	}
}
