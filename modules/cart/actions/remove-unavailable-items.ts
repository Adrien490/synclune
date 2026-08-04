"use server";

import { filterUnavailableItems } from "@/modules/cart/services/item-availability.service";
import { readCartWithSkus } from "@/modules/cart/services/read-cart-with-skus.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";

/**
 * Server Action pour retirer tous les articles indisponibles du panier
 *
 * Un article est considéré comme indisponible si :
 * - Stock insuffisant (sku.inventory < quantity)
 * - SKU inactif (sku.isActive = false)
 * - Produit non public (product.status !== "PUBLIC")
 * - SKU ou produit soft-deleted
 *
 * Compatible avec useActionState de React 19
 */
export async function removeUnavailableItems(
	_?: ActionState,
	__formData?: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.REMOVE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}

		// 2. Panier du cookie + SKUs frais (pas le cache de rendu : on décide ici
		// sur l'état courant du catalogue)
		const { cookie, items } = await readCartWithSkus();

		if (cookie.items.length === 0) {
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun article à retirer",
				data: { deletedCount: 0 },
			};
		}

		// 3. Identifier les items indisponibles via le service
		const unavailableSkuIds = new Set(filterUnavailableItems(items).map((item) => item.skuId));

		// Une ligne dont le SKU a totalement disparu de la base n'apparaît pas dans
		// `items` (cf. `readCartWithSkus`) : elle est indisponible par définition, et
		// c'est ici le seul endroit qui peut la retirer du cookie.
		const knownSkuIds = new Set(items.map((item) => item.skuId));

		const remaining = cookie.items.filter(
			(item) => knownSkuIds.has(item.skuId) && !unavailableSkuIds.has(item.skuId),
		);
		const deletedCount = cookie.items.length - remaining.length;

		if (deletedCount === 0) {
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun article indisponible",
				data: { deletedCount: 0 },
			};
		}

		await writeCartCookie({ ...cookie, items: remaining });

		return {
			status: ActionStatus.SUCCESS,
			message: `${deletedCount} article${deletedCount > 1 ? "s" : ""} indisponible${deletedCount > 1 ? "s" : ""} retiré${deletedCount > 1 ? "s" : ""}`,
			data: { deletedCount },
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression des articles indisponibles");
	}
}
