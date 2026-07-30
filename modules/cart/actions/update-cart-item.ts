"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	error,
	forbidden,
	BusinessError,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { getCartExpirationDate } from "@/modules/cart/lib/cart-session";
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
		// 1. Rate limiting + récupération contexte
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.UPDATE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		// Defense-in-depth : bloquer les mutations panier quand la boutique est fermée
		// (cf. add-to-cart.ts pour la justification — défense vs cart-sheet déjà montée).
		const storeCheck = await assertStoreOpen();
		if (storeCheck) return error(storeCheck.message);

		// 2. Extraction des données du FormData
		const rawData = {
			cartItemId: safeFormGet(formData, "cartItemId"),
			quantity: Number(formData.get("quantity")) || 1,
		};

		// 3. Validation avec Zod
		const validated = validateInput(updateCartItemSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 4. Récupérer l'item avec son panier (no need to include sku — FOR UPDATE fetches fresh data)
		const cartItem = await prisma.cartItem.findUnique({
			where: { id: validatedData.cartItemId },
			select: {
				id: true,
				skuId: true,
				cartId: true,
				quantity: true,
				cart: { select: { userId: true, sessionId: true } },
				sku: { select: { productId: true } },
			},
		});

		if (!cartItem) {
			return error("Article introuvable dans le panier");
		}

		// 5. Vérifier l'appartenance du panier
		const isOwner = userId
			? cartItem.cart.userId === userId
			: cartItem.cart.sessionId === sessionId;

		if (!isOwner) {
			return forbidden();
		}

		// 6. Quantité inchangée : aucune écriture nécessaire, MAIS on ne court-circuite
		// pas pour autant.
		//
		// Ce retour anticipé annonçait « Quantité mise à jour » sans avoir vérifié quoi
		// que ce soit : ni le stock, ni `isActive`, ni le statut du produit. Or c'est
		// exactement le geste d'un client dont la ligne est signalée en rupture et qui
		// resoumet la même quantité pour « réessayer » — il obtenait un succès. Le
		// panier n'est certes pas la garde anti-survente (le checkout re-valide sous
		// verrou), mais annoncer un succès sur une ligne devenue invalide repousse la
		// découverte du problème au moment du paiement, là où elle coûte le plus cher.
		//
		// On laisse donc la transaction s'exécuter : elle prend le `FOR UPDATE`, applique
		// les mêmes gardes, et l'`update` final est un no-op sémantique (même valeur).
		// Le seul coût est une transaction courte sur un geste rare.
		// Audit « validation stock panier » 2026-07-30, P2 mineur.
		const quantityUnchanged = validatedData.quantity === cartItem.quantity;

		// 7. Transaction: Mettre à jour l'item et le panier
		await prisma.$transaction(async (tx) => {
			// 7a. Verrouiller le SKU avec FOR UPDATE pour éviter les race conditions sur le stock
			const skuRows = await tx.$queryRaw<
				Array<{
					inventory: number;
					isActive: boolean;
					deletedAt: Date | null;
					productStatus: string;
					productDeletedAt: Date | null;
				}>
			>`
				SELECT s.inventory, s."isActive", s."deletedAt",
					p.status AS "productStatus", p."deletedAt" AS "productDeletedAt"
				FROM "ProductSku" s
				JOIN "Product" p ON p.id = s."productId"
				WHERE s.id = ${cartItem.skuId}
				FOR UPDATE OF s
			`;

			const sku = skuRows[0];
			if (!sku || !sku.isActive || sku.deletedAt) {
				throw new BusinessError(CART_ERROR_MESSAGES.SKU_INACTIVE);
			}

			if (sku.productDeletedAt || sku.productStatus !== "PUBLIC") {
				throw new BusinessError(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
			}

			// 7b. Defense-in-depth: enforce max quantity inside the transaction
			if (validatedData.quantity > MAX_QUANTITY_PER_ORDER) {
				throw new BusinessError(CART_ERROR_MESSAGES.QUANTITY_MAX);
			}

			// 7c. Si augmentation de quantité, vérifier le stock disponible
			if (validatedData.quantity > sku.inventory) {
				throw new BusinessError(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
			}

			// 7d. Mettre à jour le CartItem — sauté si la quantité est inchangée : les
			// gardes ci-dessus ont fait leur travail, il n'y a rien à écrire.
			if (quantityUnchanged) return;

			await tx.cartItem.update({
				where: { id: validatedData.cartItemId },
				data: { quantity: validatedData.quantity },
			});

			// 7e. Mettre à jour le panier
			await tx.cart.update({
				where: { id: cartItem.cartId },
				data: {
					expiresAt: userId ? null : getCartExpirationDate(),
					updatedAt: new Date(),
				},
			});
		});

		// 8. Invalider le cache
		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		// 8b. Invalider le cache du compteur de paniers pour ce produit (FOMO "dans X paniers")
		updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(cartItem.sku.productId));

		// 9. Success - Return ActionState format
		return success(`Quantité mise à jour (${validatedData.quantity})`);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour");
	}
}
