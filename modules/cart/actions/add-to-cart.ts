"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import {
	getCartExpirationDate,
	getOrCreateCartSessionId,
} from "@/modules/cart/lib/cart-session";
import { addToCartSchema } from "../schemas/cart.schemas";
import { handleActionError } from "@/shared/lib/actions";

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

		// 4. Vérifier que l'userId existe dans la base de données
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

		// 5b. Vérifier que sessionId est bien défini pour les visiteurs
		if (!userId && !sessionId) {
			return {
				status: ActionStatus.ERROR,
				message: "Impossible de créer une session panier. Veuillez réessayer.",
			};
		}

		// 6. Transaction: Trouver ou créer le panier, ajouter/mettre à jour l'item
		const transactionResult = await prisma.$transaction(async (tx) => {
			// 6a. Verrouiller le SKU en PREMIER avec FOR UPDATE pour éviter les race conditions
			// Le lock doit être acquis AVANT de lire existingItem pour garantir la cohérence
			const skuRows = await tx.$queryRaw<Array<{
				inventory: number;
				isActive: boolean;
				priceInclTax: number;
				deletedAt: Date | null;
				productId: string;
				productStatus: string;
				productDeletedAt: Date | null;
			}>>`
				SELECT
					s.inventory,
					s."isActive",
					s."priceInclTax",
					s."deletedAt",
					s."productId",
					p.status AS "productStatus",
					p."deletedAt" AS "productDeletedAt"
				FROM "ProductSku" s
				JOIN "Product" p ON s."productId" = p.id
				WHERE s.id = ${validatedData.skuId}
				FOR UPDATE OF s
			`;

			const sku = skuRows[0];

			// Validation complète du SKU (toutes les vérifications dans la transaction)
			if (!sku) {
				throw new Error(CART_ERROR_MESSAGES.SKU_NOT_FOUND);
			}

			if (sku.deletedAt || sku.productDeletedAt) {
				throw new Error(CART_ERROR_MESSAGES.PRODUCT_DELETED);
			}

			if (!sku.isActive) {
				throw new Error(CART_ERROR_MESSAGES.SKU_INACTIVE);
			}

			if (sku.productStatus !== "PUBLIC") {
				throw new Error(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
			}

			// 6b. Upsert panier (après validation SKU pour ne pas créer de panier inutile)
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

			// 6c. Lire existingItem APRÈS le lock FOR UPDATE pour éviter les race conditions
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

				// Vérification du stock (message générique pour ne pas révéler le stock exact)
				if (sku.inventory < newQuantity) {
					throw new Error(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(sku.inventory));
				}

				// Mettre à jour le CartItem
				cartItem = await tx.cartItem.update({
					where: { id: existingItem.id },
					data: {
						quantity: newQuantity,
					},
				});

				isUpdate = true;
			} else {
				newQuantity = validatedData.quantity;

				// Vérification du stock (message générique pour ne pas révéler le stock exact)
				if (sku.inventory === 0) {
					throw new Error(CART_ERROR_MESSAGES.OUT_OF_STOCK);
				}

				if (sku.inventory < validatedData.quantity) {
					throw new Error(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(sku.inventory));
				}

				// Créer le CartItem avec le prix récupéré dans la transaction (atomique)
				cartItem = await tx.cartItem.create({
					data: {
						cartId: cart.id,
						skuId: validatedData.skuId,
						quantity: validatedData.quantity,
						priceAtAdd: sku.priceInclTax,
					},
				});
			}

			return { cartItem, newQuantity, isUpdate, productId: sku.productId };
		});

		// 7. Invalider immédiatement le cache du panier (read-your-own-writes)
		// Note: updateTag suffit car les cache tags couvrent toutes les données panier
		const tags = getCartInvalidationTags(userId, sessionId || undefined);
		tags.forEach(tag => updateTag(tag));

		// 8. Invalider le cache du compteur de paniers pour ce produit (FOMO "dans X paniers")
		updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(transactionResult.productId));

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
		return handleActionError(e, "Une erreur est survenue lors de l'ajout au panier");
	}
}
