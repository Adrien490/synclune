"use server";

import { filterUnavailableItems } from "@/modules/cart/services/item-availability.service";
import { readCartWithVariants } from "@/modules/cart/services/read-cart-with-variants.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { writeCartCookie } from "@/modules/cart/lib/cart-cookie";

/**
 * Server Action pour retirer tous les articles indisponibles du panier
 *
 * Un article est considéré comme indisponible si :
 * - Stock insuffisant (variant.stock < quantity)
 * - VARIANT inactif (variant.active = false)
 * - Produit non public (!product.active)
 * - VARIANT disparu de la base (la ligne du cookie n'a plus de contrepartie)
 *
 * Déclencheur UI : `CartRemoveUnavailableButton`, dans l'alerte stock du
 * cart-sheet (câblé le 2026-08-15 — l'action existait sans appelant).
 *
 * Compatible avec useActionState de React 19
 */
export async function removeUnavailableItems(
	_?: ActionState,
	__formData?: FormData,
): Promise<ActionState> {
	try {
		// 2. Panier du cookie + VARIANTs frais (pas le cache de rendu : on décide ici
		// sur l'état courant du catalogue)
		const { cookie, items } = await readCartWithVariants();

		if (cookie.items.length === 0) {
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun article à retirer",
				data: { deletedCount: 0 },
			};
		}

		// 3. Identifier les items indisponibles via le service
		const unavailableVariantIds = new Set(
			filterUnavailableItems(items).map((item) => item.variantId),
		);

		// Une ligne dont le VARIANT a totalement disparu de la base n'apparaît pas dans
		// `items` (cf. `readCartWithVariants`) : elle est indisponible par définition, et
		// c'est ici le seul endroit qui peut la retirer du cookie.
		const knownVariantIds = new Set(items.map((item) => item.variantId));

		const remaining = cookie.items.filter(
			(item) => knownVariantIds.has(item.variantId) && !unavailableVariantIds.has(item.variantId),
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
