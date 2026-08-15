"use server";

import { prisma } from "@/shared/lib/prisma";
import {
	validateInput,
	handleActionError,
	success,
	error,
	BusinessError,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { readCartCookie, writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { updateCartItemSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";
import { MAX_QUANTITY_PER_ORDER } from "../constants/cart";

/**
 * Server Action pour mettre à jour la quantité d'un article dans le panier
 * Compatible avec useActionState de React 19
 *
 */
export async function updateCartItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 2. Validation avec Zod
		const validated = validateInput(updateCartItemSchema, {
			variantId: safeFormGet(formData, "variantId"),
			quantity: Number(formData.get("quantity")) || 1,
		});
		if ("error" in validated) return validated.error;

		const { variantId, quantity } = validated.data;

		// 3. La ligne doit exister dans le panier
		const cart = await readCartCookie();
		const existing = cart.items.find((item) => item.variantId === variantId);
		if (!existing) {
			return error("Article introuvable dans le panier");
		}

		// 4. Re-valider la ligne en base à CHAQUE soumission, quantité inchangée incluse.
		//
		// Ne pas court-circuiter sur `quantity === existing.quantity` : c'est
		// exactement le geste d'un client dont la ligne est signalée en rupture et qui
		// resoumet la même quantité pour « réessayer ». L'ancien retour anticipé lui
		// annonçait « Quantité mise à jour » sans avoir rien vérifié — ni le stock, ni
		// `isActive`, ni le statut du produit — repoussant la découverte du problème au
		// paiement, là où elle coûte le plus cher.
		// Audit « validation stock panier » 2026-07-30, P2 mineur.
		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: {
				stock: true,
				active: true,
				product: { select: { active: true } },
			},
		});

		if (!variant || !variant.active) {
			throw new BusinessError(CART_ERROR_MESSAGES.VARIANT_INACTIVE);
		}
		if (!variant.product.active) {
			throw new BusinessError(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		// Defense-in-depth : le schéma borne déjà, on re-vérifie après la lecture DB.
		if (quantity > MAX_QUANTITY_PER_ORDER) {
			throw new BusinessError(CART_ERROR_MESSAGES.QUANTITY_MAX);
		}
		if (quantity > variant.stock) {
			throw new BusinessError(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
		}

		// 5. Écriture — sautée si la quantité est inchangée : les gardes ci-dessus ont
		// fait leur travail, il n'y a rien à écrire.
		if (quantity !== existing.quantity) {
			await writeCartCookie({
				...cart,
				items: cart.items.map((item) =>
					item.variantId === variantId ? { ...item, quantity } : item,
				),
			});
		}

		return success(`Quantité mise à jour (${quantity})`);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour");
	}
}
