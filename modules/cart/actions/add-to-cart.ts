"use server";

import { getSession } from "@/shared/utils/get-session";
import { updateTags } from "@/shared/lib/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { validateSkuAndStock } from "@/modules/cart/lib/sku-validation";
import {
	getCartExpirationDate,
	getOrCreateCartSessionId,
} from "@/modules/cart/lib/cart-session";
import { addToCartSchema } from "../schemas/cart.schemas";

/**
 * Server Action pour ajouter un article au panier
 * Compatible avec useActionState de React 19
 *
 * Rate limiting configuré via CART_LIMITS.ADD
 */
export async function addToCart(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Extraction des données du FormData
		const rawData = {
			skuId: formData.get("skuId") as string,
			quantity: Number(formData.get("quantity")) || 1,
		};

		// 2. Validation avec Zod
		const result = addToCartSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = result.data;

		// 3. Rate limiting (protection anti-spam)
		const session = await getSession();
		let userId: string | undefined = session?.user?.id;
		let sessionId: string | null = !userId ? await getOrCreateCartSessionId() : null;
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);

		const rateLimitId = getRateLimitIdentifier(userId, sessionId || null, ipAddress);
		const rateLimit = checkRateLimit(rateLimitId, CART_LIMITS.ADD);

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message: rateLimit.error || "Trop de requêtes. Veuillez réessayer plus tard.",
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			};
		}

		// 4. Valider le SKU et le stock
		const skuValidation = await validateSkuAndStock({
			skuId: validatedData.skuId,
			quantity: validatedData.quantity,
		});

		if (!skuValidation.success) {
			return {
				status: ActionStatus.ERROR,
				message: skuValidation.error || "Produit indisponible",
			};
		}

		// 5. Vérifier que l'userId existe dans la base de données
		// Si l'userId n'existe pas, traiter comme un utilisateur non connecté
		if (userId) {
			const userExists = await prisma.user.findUnique({
				where: { id: userId },
				select: { id: true },
			});

			if (!userExists) {
				// Traiter comme un utilisateur non connecté
				userId = undefined;
				sessionId = await getOrCreateCartSessionId();
			}
		}

		// 6. Transaction: Trouver ou créer le panier, puis ajouter/mettre à jour l'item
		const transactionResult = await prisma.$transaction(async (tx) => {
			// 6a. Upsert panier
			const cart = await tx.cart.upsert({
				where: userId ? { userId } : { sessionId: sessionId! },
				create: {
					userId: userId || null,
					sessionId: sessionId || null,
					expiresAt: userId ? null : getCartExpirationDate(),
				},
				update: {
					expiresAt: userId ? null : getCartExpirationDate(),
					updatedAt: new Date(),
				},
			});

			// 6b. Vérifier si le SKU est déjà dans le panier
			const existingItem = await tx.cartItem.findUnique({
				where: {
					cartId_skuId: {
						cartId: cart.id,
						skuId: validatedData.skuId,
					},
				},
			});

			let cartItem;
			let newQuantity;
			let isUpdate = false;

			if (existingItem) {
				newQuantity = existingItem.quantity + validatedData.quantity;

				// Vérifier le stock pour la nouvelle quantité
				const stockCheck = await validateSkuAndStock({
					skuId: validatedData.skuId,
					quantity: newQuantity,
				});

				if (!stockCheck.success) {
					// Message personnalisé pour indiquer qu'il y a déjà des articles dans le panier
					const currentInCart = existingItem.quantity;
					const available = skuValidation.data?.sku.inventory ?? 0;
					throw new Error(
						`Vous avez déjà ${currentInCart} article${currentInCart > 1 ? "s" : ""} dans votre panier. ` +
						`Stock disponible total : ${available} exemplaire${available > 1 ? "s" : ""}.`
					);
				}

				cartItem = await tx.cartItem.update({
					where: { id: existingItem.id },
					data: {
						quantity: newQuantity,
					},
				});
				isUpdate = true;
			} else {
				newQuantity = validatedData.quantity;
				cartItem = await tx.cartItem.create({
					data: {
						cartId: cart.id,
						skuId: validatedData.skuId,
						quantity: validatedData.quantity,
						priceAtAdd: skuValidation.data?.sku.priceInclTax ?? 0,
					},
				});
			}

			return { cartItem, newQuantity, isUpdate };
		});

		// 7. Invalider immédiatement le cache du panier (read-your-own-writes)
		const tags = getCartInvalidationTags(userId, sessionId || undefined);
		updateTags(tags);

		// 8. Revalider le layout pour mettre à jour le CartBadge
		revalidatePath('/', 'layout');

		// 9. Success - Return ActionState format
		const successMessage = transactionResult.isUpdate
			? `Quantité mise à jour (${transactionResult.newQuantity})`
			: "Article ajouté au panier";

		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				cartItemId: transactionResult.cartItem.id,
				quantity: transactionResult.newQuantity,
			},
		};
	} catch (e) {
		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de l'ajout au panier",
		};
	}
}
