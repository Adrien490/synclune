"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getRateLimitIdentifier, getClientIp } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { moveToCartSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
import { getWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";
import { getOrCreateCartSessionId, getCartExpirationDate } from "@/modules/cart/lib/cart-session";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";
import { lockAndValidateSkuForMove } from "@/modules/wishlist/services/lock-and-validate-sku-for-move";
import {
	validateInput,
	handleActionError,
	success,
	error,
	BusinessError,
	enforceRateLimit,
	safeFormGet,
} from "@/shared/lib/actions";

/**
 * Server Action pour deplacer un favori vers le panier
 *
 * Pattern symetrique de cart/move-to-wishlist : preserve l'intention d'achat
 * en convertissant un favori en achat reel. UX courante e-commerce.
 *
 * Flow atomique (transaction unique) :
 * 1. Verifier produit/SKU (PUBLIC, actif, stock suffisant) avec FOR UPDATE lock
 * 2. Upsert cart (cree si inexistant)
 * 3. Upsert cart item (incremente quantite si deja present)
 * 4. Supprimer le wishlist item correspondant (productId)
 * 5. Invalidation caches cart + wishlist + product FOMO
 *
 * Note: l'absence de l'item dans la wishlist n'est PAS bloquante (idempotent).
 * Le user peut deplacer un produit ajoute en wishlist puis supprime entre-temps :
 * dans ce cas on ajoute juste au panier.
 *
 * Rate limiting via WISHLIST_LIMITS.MOVE_TO_CART (15/min, aligne avec CART.ADD).
 */
export async function moveToCart(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Authentification (user ou guest)
		const session = await getSession();
		const userId = session?.user.id;

		// Wishlist: doit deja exister (pas de creation pour move)
		// Cart: cree si necessaire (l'utilisateur va y ajouter)
		const wishlistSessionId = !userId ? await getWishlistSessionId() : null;
		const cartSessionId = !userId ? await getOrCreateCartSessionId() : null;

		if (!userId && !cartSessionId) {
			return error(WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
		}

		// 2. Rate limiting (avant validation pour anti-enumeration)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(
			userId ?? null,
			cartSessionId ?? wishlistSessionId,
			ipAddress,
		);
		const rateCheck = await enforceRateLimit(rateLimitId, WISHLIST_LIMITS.MOVE_TO_CART, ipAddress);
		if ("error" in rateCheck) return rateCheck.error;

		// 3. Validation Zod
		const rawData = {
			productId: safeFormGet(formData, "productId"),
			skuId: safeFormGet(formData, "skuId"),
			quantity: Number(formData.get("quantity")) || 1,
		};
		const validated = validateInput(moveToCartSchema, rawData);
		if ("error" in validated) return validated.error;
		const { productId, skuId, quantity } = validated.data;

		// 4. Transaction atomique
		const result = await prisma.$transaction(async (tx) => {
			// 4a. Verrouiller le SKU avec FOR UPDATE + valider produit/SKU (service partagé)
			const sku = await lockAndValidateSkuForMove(tx, skuId, productId);

			// 4b. Upsert cart
			const cart = await tx.cart.upsert({
				where: userId ? { userId } : { sessionId: cartSessionId! },
				create: {
					userId: userId ?? null,
					sessionId: cartSessionId ?? null,
					expiresAt: userId ? null : getCartExpirationDate(),
				},
				update: {
					expiresAt: userId ? null : getCartExpirationDate(),
					updatedAt: new Date(),
				},
				select: { id: true },
			});

			// 4c. Cart item: increment if exists, else create
			const existingItem = await tx.cartItem.findUnique({
				where: { cartId_skuId: { cartId: cart.id, skuId } },
				select: { id: true, quantity: true },
			});

			let cartItem;
			let newQuantity: number;
			let isUpdate = false;

			if (existingItem) {
				newQuantity = existingItem.quantity + quantity;

				if (newQuantity > MAX_QUANTITY_PER_ORDER) {
					throw new BusinessError(CART_ERROR_MESSAGES.QUANTITY_MAX);
				}
				if (sku.inventory < newQuantity) {
					throw new BusinessError(WISHLIST_ERROR_MESSAGES.INSUFFICIENT_STOCK);
				}

				cartItem = await tx.cartItem.update({
					where: { id: existingItem.id },
					data: { quantity: newQuantity },
					select: { id: true },
				});
				isUpdate = true;
			} else {
				const itemCount = await tx.cartItem.count({
					where: { cartId: cart.id },
				});
				if (itemCount >= MAX_CART_ITEMS) {
					throw new BusinessError(CART_ERROR_MESSAGES.CART_ITEMS_LIMIT(MAX_CART_ITEMS));
				}
				if (sku.inventory === 0) {
					throw new BusinessError(WISHLIST_ERROR_MESSAGES.OUT_OF_STOCK);
				}
				if (sku.inventory < quantity) {
					throw new BusinessError(WISHLIST_ERROR_MESSAGES.INSUFFICIENT_STOCK);
				}

				newQuantity = quantity;
				cartItem = await tx.cartItem.create({
					data: {
						cartId: cart.id,
						skuId,
						quantity,
						priceAtAdd: sku.priceInclTax,
					},
					select: { id: true },
				});
			}

			// 4d. Retirer de la wishlist (idempotent - deleteMany ne throw pas si 0)
			// Skip the lookup entirely when guest has no wishlist session: Prisma 7
			// treats `{ sessionId: undefined }` as an absent filter, which would
			// silently match an arbitrary user's wishlist (IDOR / data loss).
			let wishlistRemoved = false;
			const wishlistQuery = userId
				? { userId }
				: wishlistSessionId
					? { sessionId: wishlistSessionId }
					: null;

			const wishlist = wishlistQuery
				? await tx.wishlist.findFirst({
						where: wishlistQuery,
						select: { id: true },
					})
				: null;

			if (wishlist) {
				const removeResult = await tx.wishlistItem.deleteMany({
					where: { wishlistId: wishlist.id, productId },
				});
				if (removeResult.count > 0) {
					wishlistRemoved = true;
					await tx.wishlist.update({
						where: { id: wishlist.id },
						data: { updatedAt: new Date() },
					});
				}
			}

			return { cartItem, newQuantity, isUpdate, wishlistRemoved };
		});

		// 5. Invalidation caches
		const cartTags = getCartInvalidationTags(userId, cartSessionId ?? undefined);
		cartTags.forEach((tag) => updateTag(tag));
		updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(productId));

		if (result.wishlistRemoved) {
			const wishlistTags = getWishlistInvalidationTags(userId, wishlistSessionId ?? undefined);
			wishlistTags.forEach((tag) => updateTag(tag));
		}

		const message = result.isUpdate
			? `Quantite mise a jour (${result.newQuantity})`
			: result.wishlistRemoved
				? "Deplace vers le panier"
				: "Ajoute au panier";

		return success(message, {
			cartItemId: result.cartItem.id,
			quantity: result.newQuantity,
			removed: result.wishlistRemoved,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de deplacer vers le panier");
	}
}
