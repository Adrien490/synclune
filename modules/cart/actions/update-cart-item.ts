"use server";

import { prisma } from "@/shared/lib/prisma";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
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
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import { updateCartItemSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";
import { MAX_QUANTITY_PER_ORDER } from "../constants/cart";

/**
 * Server Action pour mettre à jour la quantité d'un article dans le panier
 * Compatible avec useActionState de React 19
 *
 * Rate limiting configuré via CART_LIMITS.UPDATE
 */
export async function updateCartItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.UPDATE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}

		// Defense-in-depth : bloquer les mutations panier quand la boutique est fermée
		// (cf. add-to-cart.ts pour la justification — défense vs cart-sheet déjà montée).
		const storeCheck = await assertStoreOpen();
		if (storeCheck) return error(storeCheck.message);

		// 2. Validation avec Zod
		const validated = validateInput(updateCartItemSchema, {
			skuId: safeFormGet(formData, "skuId"),
			quantity: Number(formData.get("quantity")) || 1,
		});
		if ("error" in validated) return validated.error;

		const { skuId, quantity } = validated.data;

		// 3. La ligne doit exister dans le panier
		const cart = await readCartCookie();
		const existing = cart.items.find((item) => item.skuId === skuId);
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
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				inventory: true,
				isActive: true,
				deletedAt: true,
				product: { select: { status: true, deletedAt: true } },
			},
		});

		if (!sku || !sku.isActive || sku.deletedAt) {
			throw new BusinessError(CART_ERROR_MESSAGES.SKU_INACTIVE);
		}
		if (sku.product.deletedAt || sku.product.status !== "PUBLIC") {
			throw new BusinessError(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		// Defense-in-depth : le schéma borne déjà, on re-vérifie après la lecture DB.
		if (quantity > MAX_QUANTITY_PER_ORDER) {
			throw new BusinessError(CART_ERROR_MESSAGES.QUANTITY_MAX);
		}
		if (quantity > sku.inventory) {
			throw new BusinessError(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
		}

		// 5. Écriture — sautée si la quantité est inchangée : les gardes ci-dessus ont
		// fait leur travail, il n'y a rien à écrire.
		if (quantity !== existing.quantity) {
			await writeCartCookie({
				...cart,
				items: cart.items.map((item) => (item.skuId === skuId ? { ...item, quantity } : item)),
			});
		}

		return success(`Quantité mise à jour (${quantity})`);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour");
	}
}
