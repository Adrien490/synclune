"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/shared/lib/actions/auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

export async function refreshSkus(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		const productId = formData.get("productId") as string | null;

		// Invalider les tags des SKUs
		updateTag(PRODUCTS_CACHE_TAGS.SKUS_LIST);
		updateTag(DASHBOARD_CACHE_TAGS.BADGES);
		updateTag(DASHBOARD_CACHE_TAGS.INVENTORY_LIST);

		// Si un productId est fourni, invalider aussi les SKUs de ce produit
		if (productId) {
			updateTag(PRODUCTS_CACHE_TAGS.SKUS(productId));
		}

		return {
			status: ActionStatus.SUCCESS,
			message: "Variantes rafraîchies",
		};
	} catch (error) {
		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors du rafraîchissement",
		};
	}
}
