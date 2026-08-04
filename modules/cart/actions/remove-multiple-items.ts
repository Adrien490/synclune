"use server";

import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { readCartCookie, writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { removeMultipleItemsSchema } from "../schemas/cart.schemas";

/**
 * Server Action pour supprimer plusieurs items du panier en une seule operation
 *
 * Complete removeUnavailableItems (system-driven) par une variante user-driven
 * pour UX bulk-select.
 *
 * Rate limiting via CART_LIMITS.REMOVE
 */
export async function removeMultipleItems(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.REMOVE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}

		// Parse SKU IDs (JSON array or comma-separated)
		const raw = formData.get("skuIds");
		let skuIds: string[] = [];
		if (typeof raw === "string") {
			try {
				const parsed: unknown = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					skuIds = parsed.filter((v): v is string => typeof v === "string");
				}
			} catch {
				skuIds = raw
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
			}
		}

		const validated = validateInput(removeMultipleItemsSchema, { skuIds });
		if ("error" in validated) return validated.error;

		const toRemove = new Set(validated.data.skuIds);

		const cart = await readCartCookie();
		const items = cart.items.filter((item) => !toRemove.has(item.skuId));
		const removedCount = cart.items.length - items.length;

		if (removedCount === 0) {
			return error("Aucun article valide à supprimer");
		}

		await writeCartCookie({ ...cart, items });

		return success(removedCount > 1 ? `${removedCount} articles supprimés` : "Article supprimé", {
			removedCount,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer les articles");
	}
}
